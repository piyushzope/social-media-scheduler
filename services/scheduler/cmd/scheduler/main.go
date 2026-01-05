package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
	"go.uber.org/zap"

	"github.com/social-scheduler/scheduler/internal/config"
	"github.com/social-scheduler/scheduler/internal/queue"
	"github.com/social-scheduler/scheduler/internal/publisher"
)

func main() {
	// Load .env if exists
	_ = godotenv.Load()

	// Initialize logger
	logger, _ := zap.NewProduction()
	if os.Getenv("NODE_ENV") == "development" {
		logger, _ = zap.NewDevelopment()
	}
	defer logger.Sync()

	sugar := logger.Sugar()
	sugar.Info("Starting scheduler service")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		sugar.Fatalf("Failed to load config: %v", err)
	}

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize queue client
	queueClient, err := queue.NewRedisQueue(cfg.RedisURL)
	if err != nil {
		sugar.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer queueClient.Close()

	// Initialize publisher
	pub := publisher.New(cfg, sugar)

	// Start processing scheduled posts
	go func() {
		sugar.Info("Starting queue processor")
		if err := queueClient.ProcessScheduledPosts(ctx, pub); err != nil {
			sugar.Errorf("Queue processor error: %v", err)
		}
	}()

	// Start the scheduler that moves posts to the queue
	go func() {
		sugar.Info("Starting post scheduler")
		if err := queueClient.SchedulePosts(ctx, cfg.DatabaseURL); err != nil {
			sugar.Errorf("Post scheduler error: %v", err)
		}
	}()

	sugar.Infof("Scheduler service running on port %s", cfg.Port)

	// Wait for interrupt signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	sugar.Info("Shutting down scheduler service")
	cancel()
}
