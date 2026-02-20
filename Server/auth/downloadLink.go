package auth

import (
	"CloudCrypt/config"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
)

func GenerateDownloadLink(c *gin.Context) {
	sessionToken, _ := c.Cookie("session_token")
	// Since this handler is protected by Authorize middleware (likely), we might already have user info in context.
	// But the handler in main.go: authGroup.GET("/genDLink", auth.GenerateDownloadLink) is inside "authGroup" which doesn't seem to have "filesGroup.Use(auth.Authorize())".
	// Wait, let's check main.go.
	// authGroup := apiGroup.Group("/auth")
	// authGroup has NO middleware.
	// So we need to validate session here.

	user, _, err := GetUserFromSession(sessionToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	filepath := c.Query("filepath")

	exp := time.Now().Add(30 * time.Second)
	sig := SignDownload(filepath, user.UserID, exp)

	// Determine scheme
	scheme := "http"
	if c.Request.TLS != nil || c.Request.Header.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}

	host := c.Request.Host
	link := fmt.Sprintf("%s://%s/api/dlink/download?fp=%s&u=%s&exp=%d&sig=%s",
		scheme, host, url.QueryEscape(filepath), user.UserID, exp.Unix(), sig)

	c.JSON(http.StatusOK, gin.H{"url": link})
}

func SignDownload(filepath string, userID string, exp time.Time) string {
	println("SignDownload: ", filepath, userID, exp.Unix())
	secret := config.Cfg.FileKey
	message := fmt.Sprintf("%s|%s|%d", filepath, userID, exp.Unix())
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(message))
	return hex.EncodeToString(mac.Sum(nil))
}
