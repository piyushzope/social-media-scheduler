package platforms

import (
	"context"
	"errors"

	"github.com/social-scheduler/scheduler/internal/types"
)

type TikTokClient struct {
	clientID     string
	clientSecret string
}

func NewTikTokClient(clientID, clientSecret string) *TikTokClient {
	return &TikTokClient{
		clientID:     clientID,
		clientSecret: clientSecret,
	}
}

func (c *TikTokClient) Publish(ctx context.Context, job *types.PostJob) (string, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return "", errors.New("TikTok API credentials not configured")
	}

	// TODO: Implement TikTok Content Posting API
	// Note: This API is invite-only and requires business verification
	// 1. Get OAuth 2.0 access token for the account
	// 2. Initialize video upload via POST /v2/post/publish/inbox/video/init/
	// 3. Upload video chunks
	// 4. Complete upload and publish
	// 5. Return the video ID

	return "", errors.New("TikTok publishing not yet implemented")
}

func (c *TikTokClient) RefreshToken(ctx context.Context, refreshToken string) (string, error) {
	// TODO: Implement OAuth 2.0 token refresh
	return "", errors.New("token refresh not yet implemented")
}
