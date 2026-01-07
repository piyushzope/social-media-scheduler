package platforms

import (
	"context"
	"errors"

	"github.com/social-scheduler/scheduler/internal/types"
)

type LinkedInClient struct {
	clientID     string
	clientSecret string
}

func NewLinkedInClient(clientID, clientSecret string) *LinkedInClient {
	return &LinkedInClient{
		clientID:     clientID,
		clientSecret: clientSecret,
	}
}

func (c *LinkedInClient) Publish(ctx context.Context, job *types.PostJob) (string, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return "", errors.New("LinkedIn API credentials not configured")
	}

	// TODO: Implement LinkedIn Marketing API integration
	// 1. Get OAuth 2.0 access token for the account
	// 2. For text posts: POST /ugcPosts with shareMediaCategory: "NONE"
	// 3. For media: First register upload, upload asset, then POST /ugcPosts
	// 4. Return the post URN

	return "", errors.New("LinkedIn publishing not yet implemented")
}

func (c *LinkedInClient) RefreshToken(ctx context.Context, refreshToken string) (string, error) {
	// TODO: Implement OAuth 2.0 token refresh
	return "", errors.New("token refresh not yet implemented")
}
