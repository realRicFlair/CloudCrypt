package handlers

import (
	"CloudCrypt/auth"
	"CloudCrypt/config"
	"CloudCrypt/internal/usagetracker"
	"CloudCrypt/storage"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

func UploadHandler(c *gin.Context) {
	sessionToken, err := c.Cookie("session_token")
	if err != nil {
		c.String(http.StatusUnauthorized, "No session")
		return
	}
	user, _, err := auth.GetUserFromSession(sessionToken)
	if err != nil {
		c.String(http.StatusUnauthorized, "Invalid session")
		return
	}

	mkey, err := getUserMasterKey(c, user)
	if err != nil {
		c.String(http.StatusBadRequest, "Encryption error: %v", err)
		return
	}

	fh, err := c.FormFile("file")
	if err != nil {
		c.String(http.StatusBadRequest, "No file uploaded: %v", err)
		return
	}

	logicalPath := c.PostForm("path")
	if logicalPath == "" {
		c.String(http.StatusBadRequest, "Missing target filepath")
		return
	}

	// Open uploaded file as an io.Reader
	// Gin should stores large files on disk temp
	src, err := fh.Open()
	if err != nil {
		c.String(http.StatusInternalServerError, "Error opening upload: %v", err)
		return
	}
	defer src.Close()

	// Build a sane destination path (NO leading slash) and ensure directory exists
	baseDir := config.Cfg.BaseDir
	dstPath, err := storage.ResolveForCreate(mkey, baseDir, user.UserID, filepath.Clean(logicalPath))
	if err := os.MkdirAll(filepath.Dir(dstPath), 0755); err != nil {
		c.String(http.StatusInternalServerError, "mkdir: %v", err)
		return
	}

	// Open the destination file for writing (truncate if exists)
	dst, err := os.OpenFile(dstPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		c.String(http.StatusInternalServerError, "Error creating file: %v", err)
		return
	}
	defer func() {
		_ = dst.Sync()
		_ = dst.Close()
	}()

	// Stream-encrypt directly from src -> dst (no pipes needed)
	if err := storage.Encrypt(mkey, src, dst, 0); err != nil {
		c.String(http.StatusInternalServerError, "Encrypt failed: %v", err)
		return
	}

	// sanity log
	var diskSize int64
	if fi, err := dst.Stat(); err == nil {
		diskSize = fi.Size()
		log.Printf("wrote %s (%d bytes) to %s", fh.Filename, diskSize, dstPath)
	}

	plainSize := fh.Size
	_ = storage.UpdateFileMeta(mkey, baseDir, user.UserID, filepath.Clean(logicalPath), plainSize, time.Now())

	// Track storage usage
	if err := usagetracker.IncrementStorageRecord(baseDir, user.UserID, diskSize, 1); err != nil {
		log.Printf("UsageTracker error: %v", err)
	}

	c.String(http.StatusOK, "File uploaded successfully")
}
