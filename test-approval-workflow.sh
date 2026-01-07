#!/bin/bash

API_URL="http://localhost:4000/api"
echo "======================================"
echo "Testing Approval Workflow"
echo "======================================"
echo ""

# Login as demo user
echo "1. Logging in as demo user..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in successfully"
echo "   User ID: $USER_ID"
echo ""

# Get workspaces
echo "2. Fetching workspaces..."
WORKSPACES=$(curl -s "$API_URL/workspaces" \
  -H "Authorization: Bearer $TOKEN")

WORKSPACE_ID=$(echo $WORKSPACES | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$WORKSPACE_ID" ]; then
  echo "❌ No workspaces found"
  exit 1
fi

echo "✅ Using workspace: $WORKSPACE_ID"
echo ""

# Get workspace details to find members
echo "3. Fetching workspace members..."
WORKSPACE=$(curl -s "$API_URL/workspaces/$WORKSPACE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "   Workspace members:"
echo "$WORKSPACE" | grep -o '"email":"[^"]*' | cut -d'"' -f4 | while read email; do
  echo "   - $email"
done
echo ""

# Get platform accounts
echo "4. Fetching platform accounts..."
PLATFORMS=$(curl -s "$API_URL/workspaces/$WORKSPACE_ID/platforms" \
  -H "Authorization: Bearer $TOKEN")

ACCOUNT_ID=$(echo $PLATFORMS | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ACCOUNT_ID" ]; then
  echo "⚠️  No platform accounts found - creating post anyway"
  echo ""
fi

# Create a test post
echo "5. Creating a test post..."
if [ -n "$ACCOUNT_ID" ]; then
  PLATFORM=$(echo $PLATFORMS | grep -o '"platform":"[^"]*' | head -1 | cut -d'"' -f4)
  POST_DATA='{
    "content": "Test post for approval workflow testing",
    "title": "Approval Workflow Test",
    "platforms": [{
      "platform": "'$PLATFORM'",
      "accountId": "'$ACCOUNT_ID'"
    }]
  }'
else
  # Create without platform if none available
  POST_DATA='{
    "content": "Test post for approval workflow testing",
    "title": "Approval Workflow Test",
    "platforms": []
  }'
fi

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$POST_DATA")

POST_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$POST_ID" ]; then
  echo "❌ Failed to create post"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi

echo "✅ Post created: $POST_ID"
echo ""

# Get a different user for approval (if available)
echo "6. Finding approver users..."
MEMBER_USER_ID=$(echo $WORKSPACE | grep -o '"userId":"[^"]*' | grep -v "$USER_ID" | head -1 | cut -d'"' -f4)

if [ -z "$MEMBER_USER_ID" ]; then
  echo "⚠️  No other members found - using same user as approver"
  MEMBER_USER_ID=$USER_ID
fi

echo "   Approver user ID: $MEMBER_USER_ID"
echo ""

# Submit for approval
echo "7. Submitting post for approval..."
APPROVAL_DATA='{
  "approvalSteps": [
    {
      "approverId": "'$MEMBER_USER_ID'",
      "order": 1
    }
  ]
}'

SUBMIT_RESPONSE=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/posts/$POST_ID/submit-for-approval" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$APPROVAL_DATA")

STATUS=$(echo $SUBMIT_RESPONSE | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)

if [ "$STATUS" != "PENDING_APPROVAL" ]; then
  echo "❌ Failed to submit for approval"
  echo "Response: $SUBMIT_RESPONSE"
  exit 1
fi

echo "✅ Post submitted for approval"
echo "   Status: $STATUS"
echo ""

# Get pending approvals
echo "8. Fetching pending approvals..."
PENDING=$(curl -s "$API_URL/workspaces/$WORKSPACE_ID/posts/pending-approvals" \
  -H "Authorization: Bearer $TOKEN")

PENDING_COUNT=$(echo $PENDING | grep -o '"id":"' | wc -l)
echo "✅ Found $PENDING_COUNT pending approval(s)"
echo ""

# Get approval step ID
STEP_ID=$(echo $SUBMIT_RESPONSE | grep -o '"approvalSteps":\[{"id":"[^"]*' | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$STEP_ID" ]; then
  echo "❌ Could not find approval step ID"
  exit 1
fi

echo "9. Processing approval (APPROVE)..."
APPROVE_DATA='{
  "action": "APPROVE",
  "comment": "Looks good!"
}'

APPROVE_RESPONSE=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/posts/$POST_ID/approval-steps/$STEP_ID/process" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$APPROVE_DATA")

NEW_STATUS=$(echo $APPROVE_RESPONSE | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)

if [ "$NEW_STATUS" != "APPROVED" ]; then
  echo "❌ Approval failed"
  echo "Response: $APPROVE_RESPONSE"
  exit 1
fi

echo "✅ Post approved successfully"
echo "   New status: $NEW_STATUS"
echo ""

# Verify the post details
echo "10. Verifying post details..."
POST_DETAILS=$(curl -s "$API_URL/workspaces/$WORKSPACE_ID/posts/$POST_ID" \
  -H "Authorization: Bearer $TOKEN")

APPROVAL_STATUS=$(echo $POST_DETAILS | grep -o '"approvalSteps":\[{"id":"[^"]*","order":[0-9]*,"approverId":"[^"]*","delegatedTo":[^,]*,"status":"[^"]*' | grep -o '"status":"[^"]*' | cut -d'"' -f4)

echo "✅ Approval step status: $APPROVAL_STATUS"
echo ""

echo "======================================"
echo "✅ All tests passed!"
echo "======================================"
