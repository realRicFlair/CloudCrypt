package handlers

import (
	"CloudCrypt/auth"
	"crypto/sha256"
	"fmt"
	"io"
	"os"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/hkdf"
)

// Helper to get the effective master key for the user
func getUserMasterKey(context *gin.Context, user *auth.User) ([]byte, error) {
	globalMasterKey := []byte(os.Getenv("FILEMASTERKEY"))
	var userKeyPart string

	if user.KeyStored {
		userKeyPart = user.EncryptionKeyPart
	} else {
		// Expect header
		userKeyPart = context.GetHeader("X-Encryption-Key")

		// If header missing, check for download token (query param)
		if userKeyPart == "" {
			token := context.Query("token")
			if token != "" {
				if kp, ok := getAndConsumeDownloadToken(token); ok {
					userKeyPart = kp
				}
			}
		}

		if userKeyPart == "" {
			return nil, fmt.Errorf("encryption key required")
		}
	}

	// Derive final key: HKDF(GlobalMasterKey, UserKeyPart, "user-master-key")
	h := hkdf.New(sha256.New, globalMasterKey, []byte(userKeyPart), []byte("user-master-key"))
	key := make([]byte, 32)
	if _, err := io.ReadFull(h, key); err != nil {
		return nil, err
	}
	return key, nil
}
