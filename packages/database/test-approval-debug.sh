#!/bin/bash

API_URL="http://localhost:4000/api"

# Login as approver
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "approver@test.com", "password": "password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
WORKSPACE_ID="cmk3fcn7u0000aifneo0gdf4x"

echo "Fetching pending approvals..."
PENDING=$(curl -s "$API_URL/workspaces/$WORKSPACE_ID/posts/pending-approvals" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $PENDING | jq '.'
