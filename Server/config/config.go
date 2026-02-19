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
}
type configInterface interface {
	LoadConfig() (*Config, error)
}

func LoadConfig() (*Config, error) {
	var err error
	cfg := &Config{
		BaseDir:        "./",
		FileKey:        []byte("secret"),
		Port:           "8080",
		AllowedOrigins: []string{"http://localhost:5173"},
	}

	cfg.BaseDir, err = os.Getwd()
	if err != nil {
		cfg.BaseDir = "./"
	}

	if v := os.Getenv("PORT"); v != "" {
		cfg.Port = v
	}
	//env for filekey
	if v := os.Getenv("fileKey"); v != "" {
		cfg.FileKey = []byte(v)
	}

	if v := os.Getenv("CORS_ALLOWED_ORIGINS"); v != "" {
		cfg.AllowedOrigins = strings.Split(v, ",")
	}

	return cfg, nil
}
