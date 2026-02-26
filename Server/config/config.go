package config

import (
	"os"
	"strings"
)

type Config struct {
	BaseDir        string
	FILEMASTERKEY  []byte
	Port           string
	AllowedOrigins []string
	API_URL        string
}

var Conf *Config

func LoadConfig() error {
	var err error

	Conf = &Config{
		BaseDir:        "./",
		FILEMASTERKEY:  []byte("secret"),
		Port:           "8080",
		AllowedOrigins: []string{"http://localhost:5173"},
		API_URL:        "localhost",
	}

	Conf.BaseDir, err = os.Getwd()
	if err != nil {
		Conf.BaseDir = "./"
	}

	if v := os.Getenv("PORT"); v != "" {
		Conf.Port = v
	}

	if v := os.Getenv("FILEMASTERKEY"); v != "" {
		Conf.FILEMASTERKEY = []byte(v)
	}

	if v := os.Getenv("CORS_ALLOWED_ORIGINS"); v != "" {
		Conf.AllowedOrigins = strings.Split(v, ",")
	}

	if v := os.Getenv("API_URL"); v != "" {
		Conf.API_URL = v
	}

	return nil
}
