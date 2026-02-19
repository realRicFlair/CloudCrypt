package auth

import (
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
)

// return AuthError = errors.New("Unauthorized")

func Authorize() gin.HandlerFunc {
	return func(context *gin.Context) {
		context.Set("authorized", false)

		sessionToken, err := context.Cookie("session_token")
		if err != nil || sessionToken == "" {
			context.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		user, storedCsrfToken, err := GetUserFromSession(sessionToken)
		if err != nil {
			println("Session error:", err.Error())
			context.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		// Get CSRF token from the headers
		rawcsrf := context.GetHeader("X-CSRF-TOKEN")
		csrf, _ := url.QueryUnescape(rawcsrf)
		if csrf == "" || csrf != storedCsrfToken {
			println("CSRF token error: ", csrf, " ", storedCsrfToken, "")
			context.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		context.Set("username", user.Username)
		context.Set("userid", user.UserID)
		context.Set("authorized", true)
	}
}

func SessionCheckHandler(context *gin.Context) {
	// Get session token from cookie
	sessionToken, err := context.Cookie("session_token")
	if err != nil || sessionToken == "" {
		context.JSON(http.StatusUnauthorized, gin.H{
			"authenticated": false,
			"message":       "No session token found",
		})
		return
	}

	user, _, err := GetUserFromSession(sessionToken)
	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{
			"authenticated": false,
			"message":       "Invalid or expired session",
		})
		return
	}

	// Session is valid
	resp := gin.H{
		"authenticated": true,
		"username":      user.Username,
		"email":         user.Email,
		"userID":        user.UserID,
		"key_stored":    user.KeyStored,
		"message":       "User is authenticated",
	}
	if user.ProfilePic != "" {
		resp["profile_pic"] = user.ProfilePic
	}
	context.JSON(http.StatusOK, resp)
}
