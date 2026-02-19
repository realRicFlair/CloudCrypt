package handlers

import (
	"CloudCrypt/auth"
	"CloudCrypt/db"
	"CloudCrypt/internal/share"
	"CloudCrypt/storage"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type ShareRequest struct {
	Path           string `json:"path"`
	IsFolder       bool   `json:"is_folder"`
	Password       string `json:"password"`        // Optional
	DirectDownload bool   `json:"direct_download"` // If true, share link triggers immediate download
}

func CreateShareHandler(context *gin.Context) {
	sessionToken, err := context.Cookie("session_token")
	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "No session"})
		return
	}
	user, _, err := auth.GetUserFromSession(sessionToken)
	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session"})
		return
	}

	var req ShareRequest
	if err := context.ShouldBindJSON(&req); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	mkey, err := getUserMasterKey(context, user)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Encryption key required"})
		return
	}

	userID, err := strconv.Atoi(user.UserID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
		return
	}

	baseDir, _ := os.Getwd()
	shareID, err := share.ShareFile(db.DB, mkey, baseDir, userID, req.Path, req.IsFolder, req.Password, req.DirectDownload)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	context.JSON(http.StatusOK, gin.H{"share_id": shareID, "link": "/s/" + shareID, "direct_download": req.DirectDownload})
}

func DeleteShareHandler(context *gin.Context) {
	sessionToken, err := context.Cookie("session_token")
	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "No session"})
		return
	}
	user, _, err := auth.GetUserFromSession(sessionToken)
	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session"})
		return
	}

	shareID := context.Param("id")
	baseDir, _ := os.Getwd()

	userID, err := strconv.Atoi(user.UserID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := share.UnshareFile(db.DB, baseDir, userID, shareID); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Unshared successfully"})
}

func GetShareInfoHandler(context *gin.Context) {
	shareID := context.Param("id")
	info, err := share.GetSharedFileInfo(db.DB, shareID)
	if err != nil {
		context.JSON(http.StatusNotFound, gin.H{"error": "Share not found"})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"filename":        info.OriginalFilename,
		"is_encrypted":    info.IsEncrypted,
		"is_folder":       info.IsFolder,
		"direct_download": info.DirectDownload,
		"created_at":      info.CreatedAt,
		"downloads":       info.Downloads,
	})
}

func DownloadShareHandler(context *gin.Context) {
	shareID := context.Param("id")
	info, err := share.GetSharedFileInfo(db.DB, shareID)
	if err != nil {
		context.JSON(http.StatusNotFound, gin.H{"error": "Share not found"})
		return
	}

	var password string
	if info.IsEncrypted {
		if context.Request.Method == http.MethodPost {
			var req struct {
				Password string `json:"password"`
			}
			if err := context.ShouldBindJSON(&req); err == nil {
				password = req.Password
			}
		}
	}

	baseDir, _ := os.Getwd()
	userIDStr := strconv.Itoa(info.UserID)
	filePath := filepath.Join(baseDir, "filestorage", "share_files", userIDStr, info.StoredFilename)

	f, err := os.Open(filePath)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "File missing"})
		return
	}
	defer f.Close()

	if err := share.IncrementDownloadCount(db.DB, shareID); err != nil {
		log.Printf("Failed to increment download count: %v", err)
	}

	filename := info.OriginalFilename
	if info.IsFolder && !strings.HasSuffix(filename, ".zip") {
		filename += ".zip"
	}

	context.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	context.Header("Content-Type", "application/octet-stream")

	if info.IsEncrypted {
		pwBytes := []byte(password)
		if err := storage.Decrypt(pwBytes, f, context.Writer); err != nil {
			log.Printf("Decryption failed for share %s: %v", shareID, err)
			// Can't write header here comfortably if streaming started
		}
	} else {
		io.Copy(context.Writer, f)
	}
}

func ListSharedFilesHandler(context *gin.Context) {
	sessionToken, err := context.Cookie("session_token")
	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "No session"})
		return
	}
	user, _, err := auth.GetUserFromSession(sessionToken)
	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session"})
		return
	}

	userID, _ := strconv.Atoi(user.UserID)
	files, err := share.GetSharedFiles(db.DB, userID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shared files"})
		return
	}

	context.JSON(http.StatusOK, files)
}
