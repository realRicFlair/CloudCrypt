package auth

import (
	"CloudCrypt/db"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type User struct {
	Email             string
	Username          string
	Password          string
	UserID            string
	EncryptionKeyPart string
	KeyStored         bool
	ProfilePic        string
}

type Session struct {
	SessionToken string
	CSRFToken    string
	expiryTime   time.Time
	user         *User
}

func RegisterHandler(context *gin.Context) {
	email := context.PostForm("email")
	username := context.PostForm("username")
	password := context.PostForm("password")
	encryptionKey := context.PostForm("encryption_key")
	storeKey := context.PostForm("store_key") == "true"

	if len(email) < 8 || len(password) < 8 {
		er := http.StatusNotAcceptable
		http.Error(context.Writer, http.StatusText(er)+": Email or password too short", er)
		return
	}

	// Check if user exists
	var exists bool
	err := db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)", email).Scan(&exists)
	if err != nil {
		checkError(err)
		http.Error(context.Writer, "Database error", http.StatusInternalServerError)
		return
	}
	if exists {
		er := http.StatusConflict
		http.Error(context.Writer, http.StatusText(er)+": User already exists", er)
		return
	}

	hashedPassword, err := hashPassword(password)
	checkError(err)

	var keyPart sql.NullString
	if storeKey {
		keyPart.String = encryptionKey
		keyPart.Valid = true
	} else {
		keyPart.Valid = false
	}

	stmt, err := db.DB.Prepare("INSERT INTO users(email, username, password, encryption_key_part, key_stored) VALUES(?, ?, ?, ?, ?)")
	if err != nil {
		checkError(err)
		http.Error(context.Writer, "Database error", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	_, err = stmt.Exec(email, username, hashedPassword, keyPart, storeKey)
	if err != nil {
		checkError(err)
		http.Error(context.Writer, "Database error", http.StatusInternalServerError)
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message": "User created successfully",
	})
	fmt.Println("User created successfully: ", username)
}

func LoginHandler(context *gin.Context) {
	email := context.PostForm("email")
	password := context.PostForm("password")
	if len(email) < 8 || len(password) < 8 {
		er := http.StatusNotAcceptable
		http.Error(context.Writer, http.StatusText(er), er)
		return
	}

	var id int
	var storedHash string
	var username string
	var keyStored bool

	var profilePic sql.NullString

	err := db.DB.QueryRow("SELECT id, password, username, key_stored, profile_pic FROM users WHERE email = ?", email).Scan(&id, &storedHash, &username, &keyStored, &profilePic)
	if err == sql.ErrNoRows {
		er := http.StatusNotFound
		http.Error(context.Writer, http.StatusText(er), er)
		return
	} else if err != nil {
		checkError(err)
		http.Error(context.Writer, "Database error", http.StatusInternalServerError)
		return
	}

	if !checkPasswordHash(password, storedHash) {
		er := http.StatusUnauthorized
		http.Error(context.Writer, http.StatusText(er), er)
		return
	}

	log.Printf("User logged in successfully: %s", email)

	sessionToken := generateToken(32)
	csrfToken := generateToken(32)
	expiryTime := time.Now().Add(24 * time.Hour)

	context.SetCookie("session_token", sessionToken, 3600, "/", "rorocorp.org", false, true)
	context.SetCookie("csrf_token", csrfToken, 3600, "/", "rorocorp.org", false, false)

	context.SetCookie("session_token", sessionToken, 3600, "/", "localhost", false, true)
	context.SetCookie("csrf_token", csrfToken, 3600, "/", "localhost", false, false)

	_, err = db.DB.Exec("INSERT INTO sessions (session_token, user_id, csrf_token, expiry_time) VALUES (?, ?, ?, ?)",
		sessionToken, id, csrfToken, expiryTime)
	if err != nil {
		checkError(err)
		http.Error(context.Writer, "Database error", http.StatusInternalServerError)
		return
	}

	resp := gin.H{
		"message":    "User logged in successfully",
		"username":   username,
		"email":      email,
		"key_stored": keyStored,
	}
	if profilePic.Valid {
		resp["profile_pic"] = profilePic.String
	}
	context.JSON(http.StatusOK, resp)
}

func checkError(err error) {
	if err != nil {
		log.Printf("Error: %v", err)
	}
}

// Helper function to get user from session token
func GetUserFromSession(sessionToken string) (*User, string, error) {
	var user User
	var csrfToken string
	var expiryTime time.Time
	var userIDInt int
	var profilePic sql.NullString
	var encryptionKeyPart sql.NullString
	var keyStored bool

	query := `
		SELECT u.id, u.email, u.username, u.encryption_key_part, u.key_stored, u.profile_pic, s.csrf_token, s.expiry_time 
		FROM sessions s 
		JOIN users u ON s.user_id = u.id 
		WHERE s.session_token = ?`

	err := db.DB.QueryRow(query, sessionToken).Scan(&userIDInt, &user.Email, &user.Username, &encryptionKeyPart, &keyStored, &profilePic, &csrfToken, &expiryTime)
	if err != nil {
		return nil, "", err
	}

	if time.Now().After(expiryTime) {
		return nil, "", fmt.Errorf("session expired")
	}

	user.UserID = strconv.Itoa(userIDInt)
	if encryptionKeyPart.Valid {
		user.EncryptionKeyPart = encryptionKeyPart.String
	}
	user.KeyStored = keyStored
	if profilePic.Valid {
		user.ProfilePic = profilePic.String
	}

	return &user, csrfToken, nil
}
