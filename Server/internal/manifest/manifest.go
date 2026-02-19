package manifest

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"CloudCrypt/internal/encryption"
)

const manifestFileName = "_manifest.bin"

var dirLocks sync.Map

func getLock(dir string) *sync.Mutex {
	l, _ := dirLocks.LoadOrStore(dir, &sync.Mutex{})
	return l.(*sync.Mutex)
}

func LockDir(dir string) {
	getLock(dir).Lock()
}

func UnlockDir(dir string) {
	getLock(dir).Unlock()
}

func ManifestPath(dir string) string {
	return filepath.Join(dir, manifestFileName)
}

func Load(masterKey []byte, dir string) (*Manifest, error) {
	mp := ManifestPath(dir)
	f, err := os.Open(mp)
	if err != nil {
		if os.IsNotExist(err) {
			return NewManifest(), nil
		}
		return nil, err
	}
	defer f.Close()

	// Decrypt
	var out bytes.Buffer
	if err := encryption.DecryptStream(masterKey, f, &out); err != nil {
		return nil, err
	}

	var m Manifest
	if err := json.Unmarshal(out.Bytes(), &m); err != nil {
		return nil, err
	}
	if m.Entries == nil {
		m.Entries = []Entry{}
	}
	return &m, nil
}

func Save(masterKey []byte, dir string, m *Manifest) error {
	plain, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}

	// Encrypt
	var buf bytes.Buffer
	if err := encryption.EncryptStream(masterKey, bytes.NewReader(plain), &buf, 64*1024); err != nil {
		return err
	}

	tmp := ManifestPath(dir) + ".tmp"
	if err := os.WriteFile(tmp, buf.Bytes(), 0644); err != nil {
		return err
	}
	return os.Rename(tmp, ManifestPath(dir))
}

func EnsureRoot(masterKey []byte, baseDir, userID string) (string, error) {
	root := filepath.Join(baseDir, "filestorage", userID)
	LockDir(root)
	defer UnlockDir(root)

	if err := os.MkdirAll(root, 0755); err != nil {
		return "", err
	}

	// Only save if manifest doesn't exist to avoid clobbering concurrent updates
	if _, err := os.Stat(ManifestPath(root)); os.IsNotExist(err) {
		m := NewManifest()
		if err := Save(masterKey, root, m); err != nil {
			return "", err
		}
	} else if err != nil {
		return "", err
	}

	return root, nil
}

// ResolveParentDir traverses the path and optionally creates directories.
// It returns the physical path of the parent directory of the target, and the final component logical name.
func ResolveParentDir(masterKey []byte, baseDir, userID, logicalPath string, create bool) (string, string, error) {
	cleaned := filepath.Clean(logicalPath)
	parts := strings.Split(cleaned, string(filepath.Separator))
	if len(parts) == 0 {
		return "", "", fmt.Errorf("empty logical path")
	}
	// Removing empty string if path started with separator
	if parts[0] == "" {
		parts = parts[1:]
	}
	if len(parts) == 0 {
		// Root
		root, err := EnsureRoot(masterKey, baseDir, userID)
		return root, "", err
	}

	finalName := parts[len(parts)-1]
	dirs := parts[:len(parts)-1]

	root, err := EnsureRoot(masterKey, baseDir, userID)
	if err != nil {
		return "", "", err
	}
	curDir := root

	for _, seg := range dirs {
		LockDir(curDir)

		m, err := Load(masterKey, curDir)
		if err != nil {
			UnlockDir(curDir)
			return "", "", err
		}

		_, entry := m.FindEntry(seg, "dir")
		if entry != nil {
			nextDir := filepath.Join(curDir, entry.Enc)
			UnlockDir(curDir)
			curDir = nextDir
			continue
		}

		if !create {
			UnlockDir(curDir)
			return "", "", fmt.Errorf("dir %q not found", seg)
		}

		// Create new dir
		slug, err := encryption.GenerateSlug(16)
		if err != nil {
			UnlockDir(curDir)
			return "", "", fmt.Errorf("generate slug: %w", err)
		}
		newDirPath := filepath.Join(curDir, slug)
		if err := os.MkdirAll(newDirPath, 0755); err != nil {
			UnlockDir(curDir)
			return "", "", err
		}

		// Initialize child manifest
		if err := Save(masterKey, newDirPath, NewManifest()); err != nil {
			UnlockDir(curDir)
			return "", "", err
		}

		m.AddEntry(seg, slug, "dir")

		if err := Save(masterKey, curDir, m); err != nil {
			UnlockDir(curDir)
			return "", "", err
		}

		UnlockDir(curDir)
		curDir = newDirPath
	}
	return curDir, finalName, nil
}
