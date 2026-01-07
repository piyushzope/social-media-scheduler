#!/bin/bash

API_URL="http://localhost:4000/api"

# Login as approver
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "approver@test.com", "password": "password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.id')
WORKSPACE_ID="cmk3fdzpv0000gj43woi8txz7"

echo "User ID: $USER_ID"
echo "Workspace ID: $WORKSPACE_ID"
echo ""
echo "Fetching pending approvals..."
PENDING=$(curl -s "$API_URL/workspaces/$WORKSPACE_ID/posts/pending-approvals" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $PENDING | jq '.'

# Also check the post directly
echo ""
echo "Checking post details..."
POST=$(curl -s "$API_URL/workspaces/$WORKSPACE_ID/posts/cmk3fdzr00006gj43psjbnsc5" \
  -H "Authorization: Bearer $TOKEN")

echo "Post status:" $(echo $POST | jq -r '.status')
echo "Approval steps:" 
echo $POST | jq '.approvalSteps'
