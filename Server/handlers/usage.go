package handlers

import (
	"CloudCrypt/auth"
	"CloudCrypt/internal/usagetracker"
	"net/http"

	"github.com/gin-gonic/gin"
)

func UsageHandler(c *gin.Context) {
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

	totalBytes, fileCount, err := usagetracker.GetUsage(user.UserID)
	if err != nil {
		c.String(http.StatusInternalServerError, "Error getting usage: %v", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total_bytes": totalBytes,
		"file_count":  fileCount,
	})
}
