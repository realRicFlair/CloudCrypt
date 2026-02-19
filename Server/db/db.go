package db

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() {
	var err error
	// Open SQLite database
	DB, err = sql.Open("sqlite3", "./cloudcrypt.db")
	if err != nil {
		log.Fatal(err)
	}

	// Verify connection
	if err := DB.Ping(); err != nil {
		log.Fatal(err)
	}

	createTables()
}

func createTables() {
	userTable := `CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT NOT NULL UNIQUE,
		username TEXT NOT NULL,
		password TEXT NOT NULL,
		encryption_key_part TEXT,
		key_stored BOOLEAN DEFAULT 0
	);`

	sessionTable := `CREATE TABLE IF NOT EXISTS sessions (
		session_token TEXT PRIMARY KEY,
		user_id INTEGER NOT NULL,
		csrf_token TEXT NOT NULL,
		expiry_time DATETIME NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);`

	_, err := DB.Exec(userTable)
	checkErr(err)

	// Migration: Add columns if they don't exist (basic check)
	// We ignore errors here assuming they might be "duplicate column" errors
	_, _ = DB.Exec("ALTER TABLE users ADD COLUMN encryption_key_part TEXT;")
	_, _ = DB.Exec("ALTER TABLE users ADD COLUMN key_stored BOOLEAN DEFAULT 0;")
	_, _ = DB.Exec("ALTER TABLE users ADD COLUMN profile_pic TEXT;")

	_, err = DB.Exec(sessionTable)
	checkErr(err)

	sharedFilesTable := `CREATE TABLE IF NOT EXISTS shared_files (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		file_id TEXT NOT NULL UNIQUE,
		original_filename TEXT NOT NULL,
		stored_filename TEXT NOT NULL,
		is_encrypted BOOLEAN DEFAULT 0,
		is_folder BOOLEAN DEFAULT 0,
		direct_download BOOLEAN DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		downloads INTEGER DEFAULT 0,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);`

	_, err = DB.Exec(sharedFilesTable)
	checkErr(err)

	// Migration: Add direct_download column if it doesn't exist
	_, _ = DB.Exec("ALTER TABLE shared_files ADD COLUMN direct_download BOOLEAN DEFAULT 0;")

	usageTrackerTable := `CREATE TABLE IF NOT EXISTS usage_tracker (
		user_id     INTEGER PRIMARY KEY,
		total_bytes INTEGER DEFAULT 0,
		file_count  INTEGER DEFAULT 0,
		bytes_modified_since_scan INTEGER DEFAULT 0,
		last_full_scan DATETIME,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);`

	_, err = DB.Exec(usageTrackerTable)
	checkErr(err)
}

func checkErr(err error) {
	if err != nil {
		log.Printf("DB Error: %v", err)
	}
}
