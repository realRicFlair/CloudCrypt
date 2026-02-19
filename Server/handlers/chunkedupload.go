package handlers

import (
	"CloudCrypt/auth"
	"CloudCrypt/internal/usagetracker"
	"CloudCrypt/storage"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func ChunkedUploadHandler(context *gin.Context) {
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

	// --- Chunked, stateless mode (single endpoint) ---
	// Metadata is passed as query params or headers.
	// Required for chunked mode: chunk_index, chunk_size, total_chunks, file_id, path
	if idxStr := context.Query("chunk_index"); idxStr != "" {
		// body is raw octet-stream
		path := context.Query("path")
		fileID := context.Query("file_id") // client-generated stable id (uuid/hex)
		chunkSizeStr := context.Query("chunk_size")
		totalChunksStr := context.Query("total_chunks")
		totalSizeStr := context.Query("total_size")

		if path == "" || fileID == "" || chunkSizeStr == "" || totalChunksStr == "" {
			context.String(http.StatusBadRequest, "missing chunk params")
			return
		}

		idx64, err := strconv.ParseUint(idxStr, 10, 32)
		if err != nil {
			context.String(http.StatusBadRequest, "bad chunk_index")
			return
		}
		chunkSize, err := strconv.Atoi(chunkSizeStr)
		if err != nil || chunkSize <= 0 {
			context.String(http.StatusBadRequest, "bad chunk_size")
			return
		}
		tc, err := strconv.Atoi(totalChunksStr)
		if err != nil || tc <= 0 {
			context.String(http.StatusBadRequest, "bad total_chunks")
			return
		}
		var totalSize int64
		if totalSizeStr != "" {
			if ts, err := strconv.ParseInt(totalSizeStr, 10, 64); err == nil {
				totalSize = ts
			}
		}

		blob, err := io.ReadAll(context.Request.Body)
		if err != nil {
			context.String(http.StatusBadRequest, "read body: %v", err)
			return
		}
		if len(blob) == 0 || len(blob) > chunkSize {
			context.String(http.StatusBadRequest, "invalid body len=%d (max %d)", len(blob), chunkSize)
			return
		}

		baseDir, err := os.Getwd()
		if err != nil {
			context.String(http.StatusInternalServerError, "cwd error: %v", err)
			return
		}

		done, assembledTo, err := storage.IngestChunkStateless(mkey, baseDir, user.UserID, storage.ChunkMeta{
			LogicalPath: filepath.Clean(path),
			FileID:      fileID,
			ChunkSize:   chunkSize,
			Index:       uint32(idx64),
			TotalChunks: tc,
			TotalSize:   totalSize,
		}, blob)
		if err != nil {
			context.String(http.StatusConflict, "ingest failed: %v", err)
			return
		}
		if done {
			// Track storage usage after successful assembly
			if err := usagetracker.IncrementStorageRecord(baseDir, user.UserID, totalSize, 1); err != nil {
				log.Printf("UsageTracker error: %v", err)
			}
		}
		context.JSON(http.StatusOK, gin.H{
			"ok":          true,
			"assembled":   done,
			"final_path":  assembledTo, // logical path (same as input) once assembled
			"next_action": "continue",  // client just keeps sending remaining chunks
		})
		return
	}

	// --- Fall back to single-shot upload ---
	fh, err := context.FormFile("file")
	if err != nil {
		context.String(http.StatusBadRequest, "No file uploaded: %v", err)
		return
	}
	logicalPath := context.PostForm("path")
	if logicalPath == "" {
		context.String(http.StatusBadRequest, "Missing target filepath")
		return
	}
	src, err := fh.Open()
	if err != nil {
		context.String(http.StatusInternalServerError, "Error opening upload: %v", err)
		return
	}
	defer src.Close()

	baseDir, err := os.Getwd()
	if err != nil {
		context.String(http.StatusInternalServerError, "cwd error: %v", err)
		return
	}
	dstPath, err := storage.ResolveForCreate(mkey, baseDir, user.UserID, filepath.Clean(logicalPath))
	if err != nil {
		context.String(http.StatusInternalServerError, "resolve: %v", err)
		return
	}
	if err := os.MkdirAll(filepath.Dir(dstPath), 0755); err != nil {
		context.String(http.StatusInternalServerError, "mkdir: %v", err)
		return
	}

	dst, err := os.OpenFile(dstPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		context.String(http.StatusInternalServerError, "create: %v", err)
		return
	}
	defer func() { _ = dst.Sync(); _ = dst.Close() }()

	if err := storage.Encrypt(mkey, src, dst, 0); err != nil {
		context.String(http.StatusInternalServerError, "Encrypt failed: %v", err)
		return
	}
	var diskSize int64
	if fi, err := dst.Stat(); err == nil {
		diskSize = fi.Size()
		log.Printf("wrote %s (%d bytes) to %s", fh.Filename, diskSize, dstPath)
	}
	_ = storage.UpdateFileMeta(mkey, baseDir, user.UserID, filepath.Clean(logicalPath), fh.Size, time.Now())

	// Track storage usage
	if err := usagetracker.IncrementStorageRecord(baseDir, user.UserID, diskSize, 1); err != nil {
		log.Printf("UsageTracker error: %v", err)
	}

	context.String(http.StatusOK, "File uploaded successfully")
}
