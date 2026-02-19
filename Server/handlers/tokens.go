package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

var (
	tokenStore sync.Map // map[string]tokenData
)

type tokenData struct {
	keyPart string
	expiry  time.Time
}

func generateToken() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func storeDownloadToken(keyPart string) (string, error) {
	token, err := generateToken()
	if err != nil {
		return "", err
	}
	// Valid for 1 minute to be safe
	// This is just to START the download.
	tokenStore.Store(token, tokenData{
		keyPart: keyPart,
		expiry:  time.Now().Add(60 * time.Second),
	})

	// Add a cleanup routine to prevent map growing indefinitely in the future when i got time
	return token, nil
}

func getAndConsumeDownloadToken(token string) (string, bool) {
	val, ok := tokenStore.Load(token)
	if !ok {
		return "", false
	}
	tokenStore.Delete(token) // Single use!

	data := val.(tokenData)
	if time.Now().After(data.expiry) {
		return "", false
	}
	return data.keyPart, true
}
