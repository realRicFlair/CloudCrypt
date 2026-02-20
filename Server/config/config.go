package config

import (
	"os"
	"strings"
)

type Config struct {
	BaseDir        string
	FileKey        []byte
	Port           string
	AllowedOrigins []string
	DBPath         string
}

// Cfg is the global configuration singleton, initialized by LoadConfig().
var Cfg *Config

func LoadConfig() (*Config, error) {
	cfg := &Config{
		BaseDir:        "./",
		FileKey:        []byte("secret"),
		Port:           "8080",
		AllowedOrigins: []string{"http://localhost:5173"},
		DBPath:         "./cloudcrypt.db",
	}

	// DATA_DIR overrides the base directory for file storage
	if v := os.Getenv("DATA_DIR"); v != "" {
		cfg.BaseDir = v
	} else {
		dir, err := os.Getwd()
		if err == nil {
			cfg.BaseDir = dir
		}
	}

	if v := os.Getenv("PORT"); v != "" {
		cfg.Port = v
	}

	// Unified encryption key — replaces the old FILEMASTERKEY / fileKey split
	if v := os.Getenv("FILE_MASTER_KEY"); v != "" {
		cfg.FileKey = []byte(v)
	}

	if v := os.Getenv("CORS_ALLOWED_ORIGINS"); v != "" {
		cfg.AllowedOrigins = strings.Split(v, ",")
	}

	if v := os.Getenv("DB_PATH"); v != "" {
		cfg.DBPath = v
	}

	Cfg = cfg
	return cfg, nil
}
