package storage

import (
	"CloudCrypt/internal/encryption"
	"CloudCrypt/internal/manifest"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

//=== Huge issues in copy logic right now. Fix later ===

// CopyEntry copies a file or directory from oldPath to newPath.
// If it's a directory, it operates recursively.
func CopyEntry(masterKey []byte, baseDir, userID, oldPath, newPath string) error {

	// 1. Resolve source
	srcParentDir, srcName, err := manifest.ResolveParentDir(masterKey, baseDir, userID, oldPath, false)
	if err != nil {
		return fmt.Errorf("source error: %v", err)
	}

	manifest.LockDir(srcParentDir)
	srcM, err := manifest.Load(masterKey, srcParentDir)
	if err != nil {
		manifest.UnlockDir(srcParentDir)
		return err
	}

	// Find source entry
	_, srcEntry := srcM.FindEntry(srcName, "")
	manifest.UnlockDir(srcParentDir) // Unlock early, we have the entry copy. Warning: racing buffer

	if srcEntry == nil {
		return fmt.Errorf("source entry not found")
	}

	// 2. recursive copy
	return recursiveCopy(masterKey, baseDir, userID, srcParentDir, *srcEntry, newPath)
}

func recursiveCopy(masterKey []byte, baseDir, userID, srcParentPhysPath string, entry ManifestEntry, destLogicalPath string) error {
	// Destination parent must exist, but the leaf name should be created.
	// We reuse resolveParentDir with create=true to ensure the PARENT exists, but we want to know if the target name conflicts.

	destParentDir, destName, err := manifest.ResolveParentDir(masterKey, baseDir, userID, destLogicalPath, true)
	if err != nil {
		return err
	}

	manifest.LockDir(destParentDir)
	defer manifest.UnlockDir(destParentDir)

	destM, err := manifest.Load(masterKey, destParentDir)
	if err != nil {
		return err
	}

	// Check conflict in destination
	if _, e := destM.FindEntry(destName, ""); e != nil {
		return fmt.Errorf("destination already exists")
	}

	// Prepare new entry
	newSlug, err := encryption.GenerateSlug(16)
	if err != nil {
		return err
	}

	if entry.Type == "file" {
		// Physical copy
		srcPhysFile := filepath.Join(srcParentPhysPath, entry.Enc+".bin")
		dstPhysFile := filepath.Join(destParentDir, newSlug+".bin")

		if err := copyPhysicalFile(srcPhysFile, dstPhysFile); err != nil {
			return err
		}

		e := destM.AddEntry(destName, newSlug, "file")
		e.Size = entry.Size
		return manifest.Save(masterKey, destParentDir, destM)

	} else if entry.Type == "dir" {
		// Create new physical directory
		newPhysDir := filepath.Join(destParentDir, newSlug)
		if err := os.MkdirAll(newPhysDir, 0755); err != nil {
			return err
		}

		// Initialize empty manifest for new dir
		if err := manifest.Save(masterKey, newPhysDir, manifest.NewManifest()); err != nil {
			return err
		}

		// Add entry to parent manifest
		destM.AddEntry(destName, newSlug, "dir")
		if err := manifest.Save(masterKey, destParentDir, destM); err != nil {
			return err
		}

		// Recursively copy children
		srcChildPhysDir := filepath.Join(srcParentPhysPath, entry.Enc)
		// We need to list children of source.
		// NOTE: We don't hold the lock on srcParentPhysPath anymore, so we assume valid path.
		// However, we need to read the manifest of the source CHILD dir.

		childM, err := manifest.Load(masterKey, srcChildPhysDir)
		if err != nil {
			return err // If we can't read child manifest, stop? Or warn?
		}

		for _, child := range childM.Entries {
			// Construct new logical path for child: destLogicalPath + / + child.Name
			childDestPath := filepath.Join(destLogicalPath, child.Name)
			// The recursion calls 'recursiveCopy' which does resolving again.
			//  inefficient but safer/simpler
			if err := recursiveCopy(masterKey, baseDir, userID, srcChildPhysDir, child, childDestPath); err != nil {
				return err
			}
		}

		return nil
	}

	return fmt.Errorf("unknown entry type")
}

func copyPhysicalFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	if err != nil {
		return err
	}
	return out.Sync()
}

// MoveEntry moves a file or directory from oldPath to newPath.
// It uses CopyEntry followed by DeleteEntry.
func MoveEntry(masterKey []byte, baseDir, userID, oldPath, newPath string) error {
	// Check if newPath is subpath of oldPath
	// Important for Move to avoid infinite recursion or deletion of source while copying
	// Since everything is logical, we can check string prefix with separator.
	cleanOld := filepath.Clean(oldPath)
	cleanNew := filepath.Clean(newPath)

	if cleanOld == cleanNew {
		return fmt.Errorf("cannot move to self")
	}

	// Check if newPath starts with oldPath + Separator
	if strings.HasPrefix(cleanNew, cleanOld+string(filepath.Separator)) {
		return fmt.Errorf("cannot move directory into its own subdirectory")
	}

	if err := CopyEntry(masterKey, baseDir, userID, oldPath, newPath); err != nil {
		return err
	}
	_, _, err := DeleteEntry(masterKey, baseDir, userID, oldPath)
	return err
}
