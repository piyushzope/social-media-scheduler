package platforms

import (
	"context"
	"errors"

	"github.com/social-scheduler/scheduler/internal/types"
)

type MetaClient struct {
	clientID     string
	clientSecret string
}

func NewMetaClient(clientID, clientSecret string) *MetaClient {
	return &MetaClient{
		clientID:     clientID,
		clientSecret: clientSecret,
	}
}

func (c *MetaClient) Publish(ctx context.Context, job *types.PostJob) (string, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return "", errors.New("Meta API credentials not configured")
	}

	// TODO: Implement Meta Graph API integration
	// 1. Get access token for the account (stored in database)
	// 2. Call POST /{page-id}/feed for Facebook
	// 3. Call POST /{ig-user-id}/media then /{ig-user-id}/media_publish for Instagram
	// 4. Return the published post ID

	return "", errors.New("Meta publishing not yet implemented")
}

func (c *MetaClient) RefreshToken(ctx context.Context, refreshToken string) (string, error) {
	// TODO: Implement token refresh
	return "", errors.New("token refresh not yet implemented")
}
