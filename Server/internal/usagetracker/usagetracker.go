package usagetracker

import (
	"CloudCrypt/db"
	"database/sql"
	"io/fs"
	"log"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

const (
	// FullScanThreshold is num of bytes modified (churn) since the last
	// full-scan before a new full-scan is triggered automatically.
	// Default = 10 GB. Changeable
	FullScanThreshold int64 = 10 * 1024 * 1024 * 1024

	// manifestFileName is the name of encrypted manifest files to skip during scans.
	manifestFileName = "_manifest.bin"
)

// FullScan walks the physical user directory recursively, counting every file except _manifest.bin
// updates the DB row and resets churn counter.
func FullScan(baseDir, userID string) (totalBytes int64, fileCount int64, err error) {
	root := filepath.Join(baseDir, "filestorage", userID)

	// If the user directory doesn't exist yet, return zeros
	if _, err := os.Stat(root); os.IsNotExist(err) {
		return 0, 0, nil
	}

	err = filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}
		// Skip manifest files
		if d.Name() == manifestFileName {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		totalBytes += info.Size()
		fileCount++
		return nil
	})
	if err != nil {
		return 0, 0, err
	}

	// Upsert the DB row with fresh totals
	uid, _ := strconv.Atoi(userID)
	_, err = db.DB.Exec(`
		INSERT INTO usage_tracker (user_id, total_bytes, file_count, bytes_modified_since_scan, last_full_scan)
		VALUES (?, ?, ?, 0, ?)
		ON CONFLICT(user_id) DO UPDATE SET
			total_bytes = excluded.total_bytes,
			file_count  = excluded.file_count,
			bytes_modified_since_scan = 0,
			last_full_scan = excluded.last_full_scan
	`, uid, totalBytes, fileCount, time.Now())
	if err != nil {
		return 0, 0, err
	}

	log.Printf("[UsageTracker] FullScan user=%s: %d bytes, %d files", userID, totalBytes, fileCount)
	return totalBytes, fileCount, nil
}

// IncrementStorageRecord updates the usage record incrementally.
// numBytes can be negative (for deletes). fileCountDelta is typically +1 or -1.
// If churn since the last full-scan exceeds FullScanThreshold, a full-scan is triggered.
func IncrementStorageRecord(baseDir, userID string, numBytes int64, fileCountDelta int64) error {
	uid, _ := strconv.Atoi(userID)
	absBytes := int64(math.Abs(float64(numBytes)))

	// Upsert: increment totals and churn
	_, err := db.DB.Exec(`
		INSERT INTO usage_tracker (user_id, total_bytes, file_count, bytes_modified_since_scan)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(user_id) DO UPDATE SET
			total_bytes = total_bytes + ?,
			file_count  = file_count + ?,
			bytes_modified_since_scan = bytes_modified_since_scan + ?
	`, uid, numBytes, fileCountDelta, absBytes,
		numBytes, fileCountDelta, absBytes)
	if err != nil {
		return err
	}

	// Check if churn exceeds threshold
	var churn int64
	err = db.DB.QueryRow(`SELECT bytes_modified_since_scan FROM usage_tracker WHERE user_id = ?`, uid).Scan(&churn)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	if churn >= FullScanThreshold {
		log.Printf("[UsageTracker] Churn threshold reached for user=%s (%d bytes), triggering full-scan", userID, churn)
		_, _, err = FullScan(baseDir, userID)
		return err
	}

	return nil
}

// GetUsage reads the current usage record for a user.
// Returns (0, 0, nil) if no record exists.
func GetUsage(userID string) (totalBytes int64, fileCount int64, err error) {
	uid, _ := strconv.Atoi(userID)
	err = db.DB.QueryRow(`SELECT total_bytes, file_count FROM usage_tracker WHERE user_id = ?`, uid).Scan(&totalBytes, &fileCount)
	if err == sql.ErrNoRows {
		return 0, 0, nil
	}
	return totalBytes, fileCount, err
}
