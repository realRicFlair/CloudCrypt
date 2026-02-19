package storage

import (
	"CloudCrypt/internal/manifest"
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

// ZipFolder streams a zip archive of the specified folder to w.
func ZipFolder(masterKey []byte, baseDir, userID, logicalPath string, w io.Writer) error {
	// 1. Resolve to the physical path of the folder
	// We use resolveParentDir to get the parent of the target folder, and the target's name
	parentDir, dirName, err := manifest.ResolveParentDir(masterKey, baseDir, userID, logicalPath, false)
	if err != nil {
		return err
	}

	// Lock parent to safely read manifest
	manifest.LockDir(parentDir)
	m, err := manifest.Load(masterKey, parentDir)
	manifest.UnlockDir(parentDir)
	if err != nil {
		return err
	}

	// Find the target directory entry in the parent manifest
	_, entry := m.FindEntry(dirName, "dir")
	if entry == nil {
		return fmt.Errorf("directory not found: %s", dirName)
	}

	// This is the physical root of the folder we want to zip
	rootPhysicalDir := filepath.Join(parentDir, entry.Enc)

	zw := zip.NewWriter(w)
	defer zw.Close()

	// If user downloads "Docs", the zip should contain "file.txt", not "Docs/file.txt"
	return walkAndZip(masterKey, rootPhysicalDir, "", zw)
}

func walkAndZip(masterKey []byte, physicalDir, zipPrefix string, zw *zip.Writer) error {
	// Lock directory to read its manifest
	manifest.LockDir(physicalDir)
	m, err := manifest.Load(masterKey, physicalDir)
	manifest.UnlockDir(physicalDir) // Unlock immediately after loading; we don't need to hold it while zipping
	if err != nil {
		return err
	}

	for _, entry := range m.Entries {
		currentZipPath := filepath.Join(zipPrefix, entry.Name)

		if entry.Type == "dir" {
			// Recurse
			childPhysicalDir := filepath.Join(physicalDir, entry.Enc)
			if err := walkAndZip(masterKey, childPhysicalDir, currentZipPath, zw); err != nil {
				return err
			}
		} else if entry.Type == "file" {
			// Process file
			if err := addFileToZip(masterKey, physicalDir, entry, currentZipPath, zw); err != nil {
				return err
			}
		} else {
			// Return error if entry type not defined
			return fmt.Errorf("unknown entry type: %s", entry.Type)
		}

	}
	return nil
}

func addFileToZip(masterKey []byte, physicalDir string, entry ManifestEntry, zipPath string, zw *zip.Writer) error {
	// 1. Prepare Zip Header
	header := &zip.FileHeader{
		Name:     zipPath,
		Method:   zip.Deflate,
		Modified: time.Unix(entry.ModTime, 0),
	}

	writer, err := zw.CreateHeader(header)
	if err != nil {
		return err
	}

	// 2. Open Encrypted File
	encFilePath := filepath.Join(physicalDir, entry.Enc+".bin")
	f, err := os.Open(encFilePath)
	if err != nil {
		// Verify if file exists, if not maybe just skip or error?
		if os.IsNotExist(err) {
			return nil // Skip missing files to avoid breaking the whole archive
		}
		return err
	}
	defer f.Close()

	// 3. Decrypt directly into the zip writer
	// Decrypt takes (key, reader, writer)
	if err := Decrypt(masterKey, f, writer); err != nil {
		return fmt.Errorf("failed to decrypt %s: %w", entry.Name, err)
	}

	return nil
}
