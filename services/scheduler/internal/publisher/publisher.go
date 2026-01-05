package publisher

import (
	"context"
	"fmt"

	"go.uber.org/zap"

	"github.com/social-scheduler/scheduler/internal/config"
	"github.com/social-scheduler/scheduler/internal/queue"
	"github.com/social-scheduler/scheduler/internal/platforms"
)

type Publisher struct {
	config *config.Config
	logger *zap.SugaredLogger
	meta   *platforms.MetaClient
	x      *platforms.XClient
	linkedin *platforms.LinkedInClient
	tiktok *platforms.TikTokClient
}

func New(cfg *config.Config, logger *zap.SugaredLogger) *Publisher {
	return &Publisher{
		config: cfg,
		logger: logger,
		meta:   platforms.NewMetaClient(cfg.MetaClientID, cfg.MetaClientSecret),
		x:      platforms.NewXClient(cfg.XClientID, cfg.XClientSecret),
		linkedin: platforms.NewLinkedInClient(cfg.LinkedInClientID, cfg.LinkedInClientSecret),
		tiktok: platforms.NewTikTokClient(cfg.TikTokClientID, cfg.TikTokClientSecret),
	}
}

func (p *Publisher) Publish(ctx context.Context, job *queue.PostJob) error {
	p.logger.Infof("Publishing post %s to %s", job.PostID, job.Platform)

	var err error
	var publishedID string

	switch job.Platform {
	case "META":
		publishedID, err = p.meta.Publish(ctx, job)
	case "X":
		publishedID, err = p.x.Publish(ctx, job)
	case "LINKEDIN":
		publishedID, err = p.linkedin.Publish(ctx, job)
	case "TIKTOK":
		publishedID, err = p.tiktok.Publish(ctx, job)
	default:
		return fmt.Errorf("unsupported platform: %s", job.Platform)
	}

	if err != nil {
		p.logger.Errorf("Failed to publish to %s: %v", job.Platform, err)
		return err
	}

	p.logger.Infof("Successfully published post %s to %s (ID: %s)", job.PostID, job.Platform, publishedID)

	// TODO: Update database with published status and ID
	// This would typically call back to the API or update the database directly

	return nil
}
