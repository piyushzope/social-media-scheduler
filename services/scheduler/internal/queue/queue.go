package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/social-scheduler/scheduler/internal/types"
)

const (
	scheduledPostsKey = "scheduled_posts"
	processingKey     = "processing_posts"
	failedPostsKey    = "failed_posts"
)

// Publisher interface for dependency injection
type Publisher interface {
	Publish(ctx context.Context, job *types.PostJob) error
}

type RedisQueue struct {
	client *redis.Client
}

func NewRedisQueue(redisURL string) (*RedisQueue, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse redis URL: %w", err)
	}

	client := redis.NewClient(opts)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return &RedisQueue{client: client}, nil
}

func (q *RedisQueue) Close() error {
	return q.client.Close()
}

// SchedulePosts queries the database for posts due to be published and adds them to the queue
func (q *RedisQueue) SchedulePosts(ctx context.Context, databaseURL string) error {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer pool.Close()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := q.fetchAndQueuePosts(ctx, pool); err != nil {
				// Log error but continue
				fmt.Printf("Error fetching posts: %v\n", err)
			}
		}
	}
}

func (q *RedisQueue) fetchAndQueuePosts(ctx context.Context, pool *pgxpool.Pool) error {
	// Query posts that are scheduled within the next minute and in SCHEDULED status
	query := `
		SELECT
			p.id,
			pc.id as platform_config_id,
			pc.platform,
			pc.account_id,
			COALESCE(pc.content, p.content) as content,
			COALESCE(pc.media_urls, p.media_urls) as media_urls,
			pc.hashtags,
			p.scheduled_at,
			CASE
				WHEN w.tier = 'ENTERPRISE' THEN 3
				WHEN w.tier = 'PROFESSIONAL' THEN 2
				ELSE 1
			END as priority
		FROM posts p
		JOIN post_platform_configs pc ON pc.post_id = p.id
		JOIN workspaces w ON w.id = p.workspace_id
		WHERE p.status = 'SCHEDULED'
		AND pc.status = 'SCHEDULED'
		AND p.scheduled_at <= NOW() + INTERVAL '1 minute'
		AND p.scheduled_at > NOW() - INTERVAL '15 minutes'
		ORDER BY priority DESC, p.scheduled_at ASC
	`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to query posts: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var job types.PostJob
		var mediaURLsJSON, hashtagsJSON []byte

		err := rows.Scan(
			&job.PostID,
			&job.PlatformConfig,
			&job.Platform,
			&job.AccountID,
			&job.Content,
			&mediaURLsJSON,
			&hashtagsJSON,
			&job.ScheduledAt,
			&job.Priority,
		)
		if err != nil {
			fmt.Printf("Error scanning row: %v\n", err)
			continue
		}

		// Parse JSON arrays
		json.Unmarshal(mediaURLsJSON, &job.MediaURLs)
		json.Unmarshal(hashtagsJSON, &job.Hashtags)

		// Add to queue
		if err := q.EnqueuePost(ctx, &job); err != nil {
			fmt.Printf("Error enqueueing post %s: %v\n", job.PostID, err)
		}
	}

	return nil
}

func (q *RedisQueue) EnqueuePost(ctx context.Context, job *types.PostJob) error {
	data, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal job: %w", err)
	}

	// Use sorted set with priority as score (higher = processed first)
	score := float64(job.Priority)*1e12 - float64(job.ScheduledAt.Unix())

	return q.client.ZAdd(ctx, scheduledPostsKey, &redis.Z{
		Score:  score,
		Member: data,
	}).Err()
}

// ProcessScheduledPosts continuously processes posts from the queue
func (q *RedisQueue) ProcessScheduledPosts(ctx context.Context, pub Publisher) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			// Get highest priority post
			results, err := q.client.ZPopMax(ctx, scheduledPostsKey, 1).Result()
			if err != nil {
				if err == redis.Nil {
					time.Sleep(100 * time.Millisecond)
					continue
				}
				return fmt.Errorf("failed to pop from queue: %w", err)
			}

			if len(results) == 0 {
				time.Sleep(100 * time.Millisecond)
				continue
			}

			var job types.PostJob
			if err := json.Unmarshal([]byte(results[0].Member.(string)), &job); err != nil {
				fmt.Printf("Failed to unmarshal job: %v\n", err)
				continue
			}

			// Process the job
			if err := pub.Publish(ctx, &job); err != nil {
				fmt.Printf("Failed to publish post %s: %v\n", job.PostID, err)

				// Handle retry logic
				job.RetryCount++
				if job.RetryCount < 3 {
					// Re-queue with delay
					time.Sleep(time.Duration(job.RetryCount*2) * time.Minute)
					q.EnqueuePost(ctx, &job)
				} else {
					// Move to failed queue
					data, _ := json.Marshal(job)
					q.client.LPush(ctx, failedPostsKey, data)
				}
			}
		}
	}
}
