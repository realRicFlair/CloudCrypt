package storage

import (
	"CloudCrypt/internal/encryption"
	"io"
)

func Encrypt(masterKey []byte, r io.Reader, w io.Writer, chunkSize int) error {
	return encryption.EncryptStream(masterKey, r, w, chunkSize)
}

func Decrypt(masterKey []byte, r io.Reader, w io.Writer) error {
	return encryption.DecryptStream(masterKey, r, w)
}
