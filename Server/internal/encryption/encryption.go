package encryption

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"io"

	"golang.org/x/crypto/hkdf"
)

const (
	versionByte = 1
	headerSize  = 1 + 16 + 8 + 4
	// ver(1) + salt(16) + noncePrefix(8) + chunkSize(4)
	DefaultChunk = 1 << 20 // 1 MiB
)

// GenerateSalt creates a random 16-byte salt
func GenerateSalt() ([]byte, error) {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	return b, err
}

// GenerateSlug creates a random hex string of nBytes length
func GenerateSlug(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// DeriveFileKey uses HKDF to turn file salt and masterkey into the actual file key
func DeriveFileKey(masterKey, salt []byte) ([]byte, error) {
	x := hkdf.New(sha256.New, masterKey, salt, []byte("file-key:v1"))
	key := make([]byte, 32)
	_, err := io.ReadFull(x, key)
	return key, err
}

func GetGCMBlock(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

func GenerateHeader(chunkSize int, salt, noncePrefix []byte) []byte {
	hdr := make([]byte, headerSize)
	hdr[0] = versionByte
	copy(hdr[1:17], salt)
	copy(hdr[17:25], noncePrefix)
	binary.BigEndian.PutUint32(hdr[25:29], uint32(chunkSize))
	return hdr
}

func WriteHeader(w io.Writer, chunkSize int, salt, noncePrefix []byte) ([]byte, error) {
	hdr := GenerateHeader(chunkSize, salt, noncePrefix)
	_, err := w.Write(hdr)
	return hdr, err
}

func readHeader(r io.Reader) (chunkSize int, hdr, salt, noncePrefix []byte, err error) {
	hdr = make([]byte, headerSize)
	if _, err = io.ReadFull(r, hdr); err != nil {
		return
	}
	if hdr[0] != versionByte {
		err = fmt.Errorf("unsupported version: %d", hdr[0])
		return
	}
	salt = make([]byte, 16)
	copy(salt, hdr[1:17])

	noncePrefix = make([]byte, 8)
	copy(noncePrefix, hdr[17:25])

	chunkSize = int(binary.BigEndian.Uint32(hdr[25:29]))
	return
}

// EncryptStream encrypts data from r to w using the masterKey
func EncryptStream(masterKey []byte, r io.Reader, w io.Writer, chunkSize int) error {
	if chunkSize <= 0 {
		chunkSize = DefaultChunk
	}

	// Random salt and 64-bit nonce prefix.
	salt, err := GenerateSalt()
	if err != nil {
		return err
	}

	noncePrefix := make([]byte, 8)
	if _, err := rand.Read(noncePrefix); err != nil {
		return err
	}

	// Write header and keep the exact bytes for AAD.
	hdr, err := WriteHeader(w, chunkSize, salt, noncePrefix)
	if err != nil {
		return err
	}

	key, err := DeriveFileKey(masterKey, salt)
	if err != nil {
		return err
	}
	aeadBlock, err := GetGCMBlock(key)
	if err != nil {
		return err
	}

	buf := make([]byte, chunkSize)
	nonce := make([]byte, 12) // 8B prefix || 4B counter
	copy(nonce[:8], noncePrefix)

	// Prepare AAD buffer once: header || indexBE32
	aad := make([]byte, len(hdr)+4)
	copy(aad, hdr)

	var index uint32 = 0
	for {
		n, readErr := r.Read(buf)
		if n > 0 {
			// Set per-chunk nonce and AAD index.
			binary.BigEndian.PutUint32(nonce[8:], index)
			binary.BigEndian.PutUint32(aad[len(hdr):], index)

			// Encrypt this chunk.
			ct := aeadBlock.Seal(nil, nonce, buf[:n], aad)

			var lenPrefix [4]byte
			binary.BigEndian.PutUint32(lenPrefix[:], uint32(len(ct)))
			if _, err := w.Write(lenPrefix[:]); err != nil {
				return err
			}
			if _, err := w.Write(ct); err != nil {
				return err
			}

			// Overflow guard: 2^32 chunks max.
			if index == ^uint32(0) {
				return fmt.Errorf("too many chunks: index overflow")
			}
			index++
		}

		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return readErr
		}
	}

	// log.Printf("Encrypted %d chunks", index)
	return nil
}

// DecryptStream decrypts data from r to w using the masterKey
func DecryptStream(masterKey []byte, r io.Reader, w io.Writer) error {
	chunkSize, hdr, salt, noncePrefix, err := readHeader(r)
	if err != nil {
		return err
	}

	key, err := DeriveFileKey(masterKey, salt)
	if err != nil {
		return err
	}
	aeadBlock, err := GetGCMBlock(key)
	if err != nil {
		return err
	}
	maxCTLen := uint32(chunkSize) + uint32(aeadBlock.Overhead())

	nonce := make([]byte, 12)
	copy(nonce[:8], noncePrefix)

	aad := make([]byte, len(hdr)+4)
	copy(aad, hdr)

	var index uint32 = 0
	for {
		var lenPrefix [4]byte
		_, err := io.ReadFull(r, lenPrefix[:])
		if err == io.EOF {
			// log.Printf("Decrypted %d chunks", index)
			return nil
		}
		if err != nil {
			return err
		}

		ctLen := binary.BigEndian.Uint32(lenPrefix[:])
		if ctLen > maxCTLen {
			return fmt.Errorf("chunk %d: ciphertext length %d exceeds maximum %d", index, ctLen, maxCTLen)
		}
		ciphertext := make([]byte, ctLen)
		if _, err = io.ReadFull(r, ciphertext); err != nil {
			return err
		}

		binary.BigEndian.PutUint32(nonce[8:], index)
		binary.BigEndian.PutUint32(aad[len(hdr):], index)

		plaintext, err := aeadBlock.Open(nil, nonce, ciphertext, aad)
		if err != nil {
			return fmt.Errorf("auth failed on chunk %d: %w", index, err)
		}

		if _, err = w.Write(plaintext); err != nil {
			return err
		}

		if index == ^uint32(0) {
			return fmt.Errorf("too many chunks: index overflow")
		}
		index++
	}
}
