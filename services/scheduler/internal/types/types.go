package types

import "time"

// PostJob represents a scheduled post to be published
type PostJob struct {
	PostID         string    `json:"post_id"`
	PlatformConfig string    `json:"platform_config_id"`
	Platform       string    `json:"platform"`
	AccountID      string    `json:"account_id"`
	Content        string    `json:"content"`
	MediaURLs      []string  `json:"media_urls"`
	Hashtags       []string  `json:"hashtags"`
	ScheduledAt    time.Time `json:"scheduled_at"`
	Priority       int       `json:"priority"`
	RetryCount     int       `json:"retry_count"`
}
