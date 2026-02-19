package share

import (
	"CloudCrypt/internal/encryption"
	"CloudCrypt/storage"
	"database/sql"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
)

type SharedFile struct {
	ID               int
	UserID           int
	FileID           string
	OriginalFilename string
	StoredFilename   string
	IsEncrypted      bool
	IsFolder         bool
	DirectDownload   bool
	Downloads        int
	CreatedAt        string
}

// ShareFile creates a shared copy of the file or folder.
func ShareFile(db *sql.DB, masterKey []byte, baseDir string, userID int, logicalPath string, isFolder bool, password string, directDownload bool) (string, error) {
	// 1. Generate Link ID
	shareID, err := encryption.GenerateSlug(16) // 32 hex chars
	if err != nil {
		return "", err
	}

	userIDStr := strconv.Itoa(userID)
	shareDir := filepath.Join(baseDir, "filestorage", "share_files", userIDStr)
	if err := os.MkdirAll(shareDir, 0755); err != nil {
		return "", err
	}

	destFilename := shareID
	var originalName string
	_, originalName = filepath.Split(logicalPath)

	destPath := filepath.Join(shareDir, destFilename)
	if isFolder {
		destPath += ".zip"
	} else {
		destPath += ".bin"
	}

	// 2. Prepare Source Reader
	var srcReader io.Reader
	var cleanUp func()

	if isFolder {
		pr, pw := io.Pipe()
		go func() {
			err := storage.ZipFolder(masterKey, baseDir, userIDStr, logicalPath, pw)
			pw.CloseWithError(err)
		}()
		srcReader = pr
	} else {
		physPath, err := storage.ResolveForRead(masterKey, baseDir, userIDStr, logicalPath)
		if err != nil {
			return "", err
		}
		f, err := os.Open(physPath)
		if err != nil {
			return "", err
		}
		cleanUp = func() { f.Close() }

		// Decrypt stream
		pr, pw := io.Pipe()
		go func() {
			defer pw.Close()
			if err := storage.Decrypt(masterKey, f, pw); err != nil {
				pw.CloseWithError(err)
			}
		}()
		srcReader = pr
	}
	if cleanUp != nil {
		defer cleanUp()
	}

	// 3. Create Destination File
	dstFile, err := os.Create(destPath)
	if err != nil {
		return "", err
	}
	defer dstFile.Close()

	// 4. Encrypt or Copy
	isEncrypted := (password != "") //if password empty, file not encrypted
	if isEncrypted {
		pwBytes := []byte(password)
		if err := storage.Encrypt(pwBytes, srcReader, dstFile, 0); err != nil {
			os.Remove(destPath)
			return "", err
		}
	} else {
		if _, err := io.Copy(dstFile, srcReader); err != nil {
			os.Remove(destPath)
			return "", err
		}
	}

	// 5. Insert into DB
	stmt := `INSERT INTO shared_files (
		user_id, file_id, original_filename, stored_filename, is_encrypted, is_folder, direct_download
	) VALUES (?, ?, ?, ?, ?, ?, ?)`

	storedFilename := filepath.Base(destPath)
	_, err = db.Exec(stmt, userID, shareID, originalName, storedFilename, isEncrypted, isFolder, directDownload)
	if err != nil {
		os.Remove(destPath)
		return "", err
	}

	return shareID, nil
}

func UnshareFile(db *sql.DB, baseDir string, userID int, shareID string) error {
	var storedFilename string
	err := db.QueryRow("SELECT stored_filename FROM shared_files WHERE file_id = ? AND user_id = ?", shareID, userID).Scan(&storedFilename)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("share record on db not found")
		}
		return err
	}

	_, err = db.Exec("DELETE FROM shared_files WHERE file_id = ?", shareID)
	if err != nil {
		return err
	}

	userIDStr := strconv.Itoa(userID)
	path := filepath.Join(baseDir, "filestorage", "share_files", userIDStr, storedFilename)
	return os.Remove(path)
}

func IncrementDownloadCount(db *sql.DB, shareID string) error {
	_, err := db.Exec("UPDATE shared_files SET downloads = downloads + 1 WHERE file_id = ?", shareID)
	return err
}

func GetSharedFileInfo(db *sql.DB, shareID string) (*SharedFile, error) {
	s := &SharedFile{}
	err := db.QueryRow(`SELECT id, user_id, file_id, original_filename, stored_filename, is_encrypted, is_folder, direct_download, downloads, created_at 
		FROM shared_files WHERE file_id = ?`, shareID).Scan(
		&s.ID, &s.UserID, &s.FileID, &s.OriginalFilename, &s.StoredFilename, &s.IsEncrypted, &s.IsFolder, &s.DirectDownload, &s.Downloads, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func GetSharedFiles(db *sql.DB, userID int) ([]SharedFile, error) {
	rows, err := db.Query(`SELECT id, user_id, file_id, original_filename, stored_filename, is_encrypted, is_folder, direct_download, downloads, created_at 
		FROM shared_files WHERE user_id = ? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	files := make([]SharedFile, 0)
	for rows.Next() {
		var s SharedFile
		if err := rows.Scan(&s.ID, &s.UserID, &s.FileID, &s.OriginalFilename, &s.StoredFilename, &s.IsEncrypted, &s.IsFolder, &s.DirectDownload, &s.Downloads, &s.CreatedAt); err != nil {
			return nil, err
		}
		files = append(files, s)
	}
	return files, nil
}
