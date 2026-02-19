package auth

import (
	"CloudCrypt/db"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

// UpdateProfileHandler allows a user to update their username, email, and password
// Validates current password before making any changes.
// Requires valid session.
func UpdateProfileHandler(c *gin.Context) {
	sessionToken, err := c.Cookie("session_token")
	if err != nil {
		c.String(http.StatusUnauthorized, "No session")
		return
	}
	user, _, err := GetUserFromSession(sessionToken)
	if err != nil {
		c.String(http.StatusUnauthorized, "Invalid session")
		return
	}

	type ProfileUpdateReq struct {
		Username        string `json:"username"`
		Email           string `json:"email"`
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}

	var req ProfileUpdateReq
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Validate current password
	var storedHash string
	err = db.DB.QueryRow("SELECT password FROM users WHERE id = ?", user.UserID).Scan(&storedHash)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if !checkPasswordHash(req.CurrentPassword, storedHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect current password"})
		return
	}

	// Dynamic Update Query
	// Only update fields that are provided
	if req.Username != "" {
		if _, err := db.DB.Exec("UPDATE users SET username = ? WHERE id = ?", req.Username, user.UserID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update username"})
			return
		}
	}
	if req.Email != "" {
		// Basic email validation could go here
		if _, err := db.DB.Exec("UPDATE users SET email = ? WHERE id = ?", req.Email, user.UserID); err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already in use or error updating"})
			return
		}
	}
	if req.NewPassword != "" {
		if len(req.NewPassword) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "New password too short"})
			return
		}
		newHash, err := hashPassword(req.NewPassword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		if _, err := db.DB.Exec("UPDATE users SET password = ? WHERE id = ?", newHash, user.UserID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

// UploadAvatarHandler handles uploading a profile picture
// Saves to assets/avatars/{userID}{ext}
func UploadAvatarHandler(c *gin.Context) {
	sessionToken, err := c.Cookie("session_token")
	if err != nil {
		c.String(http.StatusUnauthorized, "No session")
		return
	}
	user, _, err := GetUserFromSession(sessionToken)
	if err != nil {
		c.String(http.StatusUnauthorized, "Invalid session")
		return
	}

	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Ensure directory exists
	// Ensure directory exists
	avatarDir := "./avatars"
	if err := os.MkdirAll(avatarDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server filesystem error"})
		return
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s%s", user.UserID, ext)
	dstPath := filepath.Join(avatarDir, filename)

	if err := c.SaveUploadedFile(file, dstPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Update DB
	// We'll store the relative path or URL. Let's store "/api/avatars/{filename}" if we serve it there.
	// Or just the filename. Let's store just the filename for flexibility.
	// Actually, let's store the full web-accessible path for frontend convenience: "/api/avatars/<filename>"
	webPath := fmt.Sprintf("/api/avatars/%s", filename)

	_, err = db.DB.Exec("UPDATE users SET profile_pic = ? WHERE id = ?", webPath, user.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database update failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Avatar uploaded", "profile_pic": webPath})
}

// SwapKeyModeHandler switches between Server-Managed and User-Managed keys
func SwapKeyModeHandler(c *gin.Context) {
	sessionToken, err := c.Cookie("session_token")
	if err != nil {
		c.String(http.StatusUnauthorized, "No session")
		return
	}
	user, _, err := GetUserFromSession(sessionToken)
	if err != nil {
		c.String(http.StatusUnauthorized, "Invalid session")
		return
	}

	type SwapReq struct {
		Mode     string `json:"mode"` // "server" or "user"
		Password string `json:"password"`
	}
	var req SwapReq
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Validate Password
	var storedHash string
	err = db.DB.QueryRow("SELECT password FROM users WHERE id = ?", user.UserID).Scan(&storedHash)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !checkPasswordHash(req.Password, storedHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect password"})
		return
	}

	if req.Mode == "server" {
		// User wants Server Managed.
		// User MUST currently be User Managed (KeyStored = false), so they are sending X-Encryption-Key header.
		// We take that key and store it.

		if user.KeyStored {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Already server managed"})
			return
		}

		userProvidedKey := c.GetHeader("X-Encryption-Key")
		if userProvidedKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing current encryption key in header"})
			return
		}

		_, err := db.DB.Exec("UPDATE users SET encryption_key_part = ?, key_stored = 1 WHERE id = ?", userProvidedKey, user.UserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update key mode"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Switched to Server Managed"})

	} else if req.Mode == "user" {
		// User wants User Managed.
		// We retrieve the stored key, return it, and set KeyStored = 0.

		if !user.KeyStored {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Already user managed"})
			return
		}

		var storedKey sql.NullString
		err := db.DB.QueryRow("SELECT encryption_key_part FROM users WHERE id = ?", user.UserID).Scan(&storedKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}

		if !storedKey.Valid {
			// Should not happen if KeyStored=true, but handle it
			c.JSON(http.StatusInternalServerError, gin.H{"error": "No key found to return"})
			return
		}

		// Don't delete the key, just set key_stored = 0. Use same key value.
		_, err = db.DB.Exec("UPDATE users SET key_stored = 0 WHERE id = ?", user.UserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update key mode"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Switched to User Managed", "key": storedKey.String})

	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid mode"})
	}
}
