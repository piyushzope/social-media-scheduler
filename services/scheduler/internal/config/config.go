package config

import (
	"errors"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	RedisURL    string
	Environment string

	// Platform API credentials
	MetaClientID     string
	MetaClientSecret string
	XClientID        string
	XClientSecret    string
	LinkedInClientID string
	LinkedInClientSecret string
	TikTokClientID   string
	TikTokClientSecret string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:        getEnv("SCHEDULER_PORT", "4001"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		Environment: getEnv("NODE_ENV", "development"),

		MetaClientID:     os.Getenv("META_CLIENT_ID"),
		MetaClientSecret: os.Getenv("META_CLIENT_SECRET"),
		XClientID:        os.Getenv("X_CLIENT_ID"),
		XClientSecret:    os.Getenv("X_CLIENT_SECRET"),
		LinkedInClientID: os.Getenv("LINKEDIN_CLIENT_ID"),
		LinkedInClientSecret: os.Getenv("LINKEDIN_CLIENT_SECRET"),
		TikTokClientID:   os.Getenv("TIKTOK_CLIENT_ID"),
		TikTokClientSecret: os.Getenv("TIKTOK_CLIENT_SECRET"),
	}

	if cfg.DatabaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
