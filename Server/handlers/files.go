package handlers

import (
	"CloudCrypt/auth"
	"CloudCrypt/config"
	"CloudCrypt/internal/usagetracker"
	"CloudCrypt/storage"
	"log"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

//Contains handlers for basic file ops such as:
// delete, rename, create folder, list, copy, move

func DeleteHandler(context *gin.Context) {
	sessionToken, err := context.Cookie("session_token")
	if err != nil {
		context.String(http.StatusUnauthorized, "No session")
		return
	}
	user, _, err := auth.GetUserFromSession(sessionToken)
	if err != nil {
		context.String(http.StatusUnauthorized, "Invalid session")
		return
	}

	mkey, err := getUserMasterKey(context, user)
	if err != nil {
		context.String(http.StatusBadRequest, "Encryption error: %v", err)
		return
	}

	path := context.Query("path")
	if path == "" {
		context.String(http.StatusBadRequest, "Missing path parameter")
		return
	}

	baseDir := config.Cfg.BaseDir
	deletedBytes, deletedFiles, err := storage.DeleteEntry(mkey, baseDir, user.UserID, filepath.Clean(path))
	if err != nil {
		if err.Error() == "not found" {
			context.String(http.StatusNotFound, "not found")
			return
		}
		context.String(http.StatusInternalServerError, "delete error: %v", err)
		return
	}

	// Track storage usage (negative values for deletion)
	if err := usagetracker.IncrementStorageRecord(baseDir, user.UserID, -deletedBytes, -deletedFiles); err != nil {
		log.Printf("UsageTracker error: %v", err)
	}

	context.Status(http.StatusOK)
}

func RenameHandler(context *gin.Context) {
	sessionToken, err := context.Cookie("session_token")
	if err != nil {
		context.String(http.StatusUnauthorized, "No session")
		return
	}
	user, _, err := auth.GetUserFromSession(sessionToken)
	if err != nil {
		context.String(http.StatusUnauthorized, "Invalid session")
		return
	}
	mkey, err := getUserMasterKey(context, user)
	if err != nil {
		context.String(http.StatusBadRequest, "Encryption error: %v", err)
		return
	}

	type RenameReq struct {
		OldPath string `json:"oldPath"`
		NewName string `json:"newName"`
	}
	var req RenameReq
	if err := context.BindJSON(&req); err != nil {
		context.String(http.StatusBadRequest, "bad request")
		return
	}

	baseDir := config.Cfg.BaseDir
	if err := storage.RenameEntry(mkey, baseDir, user.UserID, filepath.Clean(req.OldPath), req.NewName); err != nil {
		context.String(http.StatusInternalServerError, "rename error: %v", err)
		return
	}
	context.Status(http.StatusOK)
}

func CreateFolderHandler(context *gin.Context) {
	sessionToken, err := context.Cookie("session_token")
	if err != nil {
		context.String(http.StatusUnauthorized, "No session")
		return
	}
	user, _, err := auth.GetUserFromSession(sessionToken)
	if err != nil {
		context.String(http.StatusUnauthorized, "Invalid session")
		return
	}
	mkey, err := getUserMasterKey(context, user)
	if err != nil {
		context.String(http.StatusBadRequest, "Encryption error: %v", err)
		return
	}

	type FolderReq struct {
		Path string `json:"path"`
	}
	var req FolderReq
	if err := context.BindJSON(&req); err != nil {
		context.String(http.StatusBadRequest, "bad request")
		return
	}

	baseDir := config.Cfg.BaseDir
	if err := storage.CreateDirectory(mkey, baseDir, user.UserID, filepath.Clean(req.Path)); err != nil {
		context.String(http.StatusInternalServerError, "create dir error: %v", err)
		return
	}
	context.Status(http.StatusOK)
}

func ListHandler(context *gin.Context) {
	sessionToken, err := context.Cookie("session_token")
	if err != nil {
		context.String(http.StatusUnauthorized, "No session")
		return
	}
	user, _, err := auth.GetUserFromSession(sessionToken)
	if err != nil {
		context.String(http.StatusUnauthorized, "Invalid session")
		return
	}

	mkey, err := getUserMasterKey(context, user)
	if err != nil {
		context.String(http.StatusBadRequest, "Encryption error: %v", err)
		return
	}

	requestedPath := context.Query("filepath")
	if requestedPath == "" {
		requestedPath = "." // default to root
	}
	baseDir := config.Cfg.BaseDir

	entries, err := storage.ListDir(mkey, baseDir, user.UserID, filepath.Clean(requestedPath))
	if err != nil {
		context.String(http.StatusNotFound, "Error listing directory: %v", err)
		return
	}

	// Return plaintext metadata as JSON
	context.JSON(http.StatusOK, gin.H{
		"path":    requestedPath,
		"entries": entries,
	})
}

func CopyHandler(context *gin.Context) {
	sessionToken, err := context.Cookie("session_token")
	if err != nil {
		context.String(http.StatusUnauthorized, "No session")
		return
	}
	user, _, err := auth.GetUserFromSession(sessionToken)
	if err != nil {
		context.String(http.StatusUnauthorized, "Invalid session")
		return
	}
	mkey, err := getUserMasterKey(context, user)
	if err != nil {
		context.String(http.StatusBadRequest, "Encryption error: %v", err)
		return
	}

	type CopyReq struct {
		OldPath string `json:"oldPath"`
		NewPath string `json:"newPath"`
	}
	var req CopyReq
	if err := context.BindJSON(&req); err != nil {
		context.String(http.StatusBadRequest, "bad request")
		return
	}

	baseDir := config.Cfg.BaseDir
	if err := storage.CopyEntry(mkey, baseDir, user.UserID, req.OldPath, req.NewPath); err != nil {
		context.String(http.StatusInternalServerError, "copy error: %v", err)
		return
	}
	context.Status(http.StatusOK)
}

func MoveHandler(context *gin.Context) {
	sessionToken, err := context.Cookie("session_token")
	if err != nil {
		context.String(http.StatusUnauthorized, "No session")
		return
	}
	user, _, err := auth.GetUserFromSession(sessionToken)
	if err != nil {
		context.String(http.StatusUnauthorized, "Invalid session")
		return
	}
	mkey, err := getUserMasterKey(context, user)
	if err != nil {
		context.String(http.StatusBadRequest, "Encryption error: %v", err)
		return
	}

	type MoveReq struct {
		OldPath string `json:"oldPath"`
		NewPath string `json:"newPath"`
	}
	var req MoveReq
	if err := context.BindJSON(&req); err != nil {
		context.String(http.StatusBadRequest, "bad request")
		return
	}

	baseDir := config.Cfg.BaseDir
	if err := storage.MoveEntry(mkey, baseDir, user.UserID, req.OldPath, req.NewPath); err != nil {
		context.String(http.StatusInternalServerError, "move error: %v", err)
		return
	}
	context.Status(http.StatusOK)
}
