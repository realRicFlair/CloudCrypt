package storage

import (
	"CloudCrypt/internal/encryption"
	"CloudCrypt/internal/manifest"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// ManifestEntry is exposed for handlers (e.g. ListHandler)
type ManifestEntry = manifest.Entry

func ResolveForCreate(masterKey []byte, baseDir, userID, logicalPath string) (string, error) {
	parentDir, fileName, err := manifest.ResolveParentDir(masterKey, baseDir, userID, logicalPath, true)
	if err != nil {
		return "", err
	}

	manifest.LockDir(parentDir)
	defer manifest.UnlockDir(parentDir)

	m, err := manifest.Load(masterKey, parentDir)
	if err != nil {
		return "", err
	}

	// Check if file exists
	if _, e := m.FindEntry(fileName, "file"); e != nil {
		return filepath.Join(parentDir, e.Enc+".bin"), nil
	}

	// New File
	slug, err := encryption.GenerateSlug(16)
	if err != nil {
		return "", fmt.Errorf("generate slug: %w", err)
	}
	m.AddEntry(fileName, slug, "file")

	if err := manifest.Save(masterKey, parentDir, m); err != nil {
		return "", err
	}

	return filepath.Join(parentDir, slug+".bin"), nil
}

func ResolveForRead(masterKey []byte, baseDir, userID, logicalPath string) (string, error) {
	parentDir, fileName, err := manifest.ResolveParentDir(masterKey, baseDir, userID, logicalPath, false)
	if err != nil {
		return "", err
	}

	manifest.LockDir(parentDir)
	defer manifest.UnlockDir(parentDir)

	m, err := manifest.Load(masterKey, parentDir)
	if err != nil {
		// If manifest load fails, we can't find the file
		return "", err
	}

	if _, e := m.FindEntry(fileName, "file"); e != nil {
		return filepath.Join(parentDir, e.Enc+".bin"), nil
	}
	return "", fmt.Errorf("file %q not found", fileName)
}

func UpdateFileMeta(masterKey []byte, baseDir, userID, logicalPath string, size int64, mod time.Time) error {
	parentDir, fileName, err := manifest.ResolveParentDir(masterKey, baseDir, userID, logicalPath, false)
	if err != nil {
		return err
	}

	manifest.LockDir(parentDir)
	defer manifest.UnlockDir(parentDir)

	m, err := manifest.Load(masterKey, parentDir)
	if err != nil {
		return err
	}

	idx, e := m.FindEntry(fileName, "file")
	if e == nil {
		return fmt.Errorf("file missing")
	}
	m.Entries[idx].Size = size
	m.Entries[idx].ModTime = mod.Unix()
	return manifest.Save(masterKey, parentDir, m)
}

func CreateDirectory(masterKey []byte, baseDir, userID, logicalPath string) error {
	parentDir, dirName, err := manifest.ResolveParentDir(masterKey, baseDir, userID, logicalPath, true)
	if err != nil {
		return err
	}

	// Logic from original: ensure no conflict, create subdir, add to manifest
	manifest.LockDir(parentDir)
	defer manifest.UnlockDir(parentDir)

	m, err := manifest.Load(masterKey, parentDir)
	if err != nil {
		return err
	}

	if _, e := m.FindEntry(dirName, ""); e != nil {
		return fmt.Errorf("name conflict")
	}

	slug, err := encryption.GenerateSlug(16)
	if err != nil {
		return fmt.Errorf("generate slug: %w", err)
	}
	newDirPath := filepath.Join(parentDir, slug)
	if err := os.MkdirAll(newDirPath, 0755); err != nil {
		return err
	}

	// Initialize new dir manifest
	if err := manifest.Save(masterKey, newDirPath, manifest.NewManifest()); err != nil {
		return err
	}

	m.AddEntry(dirName, slug, "dir")
	return manifest.Save(masterKey, parentDir, m)
}

// DeleteEntry removes a file or directory and returns the total bytes and file count
// that were removed (on disk), excluding manifest files. This allows callers to track
// storage usage changes.
func DeleteEntry(masterKey []byte, baseDir, userID, logicalPath string) (deletedBytes int64, deletedFiles int64, err error) {
	parentDir, name, err := manifest.ResolveParentDir(masterKey, baseDir, userID, logicalPath, false)
	if err != nil {
		return 0, 0, err
	}

	manifest.LockDir(parentDir)
	defer manifest.UnlockDir(parentDir)

	m, err := manifest.Load(masterKey, parentDir)
	if err != nil {
		return 0, 0, err
	}

	idx, entry := m.FindEntry(name, "")
	if entry == nil {
		return 0, 0, os.ErrNotExist
	}

	// Physical path
	phyPath := filepath.Join(parentDir, entry.Enc)
	if entry.Type == "file" {
		phyPath += ".bin"
	}

	// Stat size(s) before deleting
	filepath.WalkDir(phyPath, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil || d.IsDir() {
			return walkErr
		}
		if d.Name() == "_manifest.bin" {
			return nil
		}
		if info, err := d.Info(); err == nil {
			deletedBytes += info.Size()
			deletedFiles++
		}
		return nil
	})

	if err := os.RemoveAll(phyPath); err != nil {
		return 0, 0, err
	}

	// Remove from manifest
	m.Entries = append(m.Entries[:idx], m.Entries[idx+1:]...)
	return deletedBytes, deletedFiles, manifest.Save(masterKey, parentDir, m)
}

func RenameEntry(masterKey []byte, baseDir, userID, oldPath, newName string) error {
	parentDir, name, err := manifest.ResolveParentDir(masterKey, baseDir, userID, oldPath, false)
	if err != nil {
		return err
	}

	manifest.LockDir(parentDir)
	defer manifest.UnlockDir(parentDir)

	m, err := manifest.Load(masterKey, parentDir)
	if err != nil {
		return err
	}

	if _, e := m.FindEntry(newName, ""); e != nil {
		return fmt.Errorf("name conflict")
	}

	idx, entry := m.FindEntry(name, "")
	if entry == nil {
		return os.ErrNotExist
	}

	m.Entries[idx].Name = newName
	return manifest.Save(masterKey, parentDir, m)
}

// check locking logic later

func ListDir(masterKey []byte, baseDir, userID, logicalPath string) ([]ManifestEntry, error) {
	// special case: root
	if logicalPath == "" || logicalPath == "." || logicalPath == "/" {
		root, err := manifest.EnsureRoot(masterKey, baseDir, userID)
		if err != nil {
			return nil, err
		}
		manifest.LockDir(root)
		defer manifest.UnlockDir(root)
		m, err := manifest.Load(masterKey, root)
		if err != nil {
			return nil, err
		}
		return m.Entries, nil
	}

	parentDir, dirName, err := manifest.ResolveParentDir(masterKey, baseDir, userID, logicalPath, false)
	if err != nil {
		return nil, err
	}

	manifest.LockDir(parentDir)
	defer manifest.UnlockDir(parentDir)

	m, err := manifest.Load(masterKey, parentDir)
	if err != nil {
		return nil, err
	}
	_, entry := m.FindEntry(dirName, "dir")
	if entry == nil {
		return nil, fmt.Errorf("%q is not a directory", logicalPath)
	}

	childDir := filepath.Join(parentDir, entry.Enc)

	cm, err := manifest.Load(masterKey, childDir)
	if err != nil {
		return nil, err
	}
	return cm.Entries, nil
}
