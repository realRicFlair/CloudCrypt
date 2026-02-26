package auth

import (
	"CloudCrypt/config"
	"CloudCrypt/db"
	"net/http"

	"github.com/gin-gonic/gin"
)

// LogoutHandler invalidates the user's session and clears cookies
func LogoutHandler(context *gin.Context) {
	sessionToken, err := context.Cookie("session_token")
	if err != nil || sessionToken == "" {
		// No session to invalidate, just clear cookies anyway
		clearCookies(context)
		context.JSON(http.StatusOK, gin.H{"message": "Logged out"})
		return
	}

	// Delete session from database
	_, err = db.DB.Exec("DELETE FROM sessions WHERE session_token = ?", sessionToken)
	if err != nil {
		// Log but don't fail - still clear cookies
		checkError(err)
	}

	clearCookies(context)
	context.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func clearCookies(context *gin.Context) {
	// Clear cookies for domain
	context.SetCookie("session_token", "", -1, "/", config.Conf.API_URL, false, true)
	context.SetCookie("csrf_token", "", -1, "/", config.Conf.API_URL, false, false)

	// Clear cookies without domain (covers edge cases)
	context.SetCookie("session_token", "", -1, "/", "", false, true)
	context.SetCookie("csrf_token", "", -1, "/", "", false, false)
}
