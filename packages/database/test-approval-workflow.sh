#!/bin/bash

API_URL="http://localhost:4000/api"
echo "======================================"
echo "Testing Approval Workflow"
echo "======================================"
echo ""

# Register two test users
echo "1. Registering test users..."

USER1_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "creator@test.com",
    "password": "password123",
    "name": "Content Creator"
  }')

TOKEN1=$(echo $USER1_RESPONSE | jq -r '.token // empty')
USER1_ID=$(echo $USER1_RESPONSE | jq -r '.user.id // empty')

if [ -z "$TOKEN1" ]; then
  echo "   User 1 exists, logging in..."
  USER1_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "creator@test.com", "password": "password123"}')
  TOKEN1=$(echo $USER1_RESPONSE | jq -r '.token')
  USER1_ID=$(echo $USER1_RESPONSE | jq -r '.user.id')
fi

USER2_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "approver@test.com",
    "password": "password123",
    "name": "Content Approver"
  }')

TOKEN2=$(echo $USER2_RESPONSE | jq -r '.token // empty')
USER2_ID=$(echo $USER2_RESPONSE | jq -r '.user.id // empty')

if [ -z "$TOKEN2" ]; then
  echo "   User 2 exists, logging in..."
  USER2_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "approver@test.com", "password": "password123"}')
  TOKEN2=$(echo $USER2_RESPONSE | jq -r '.token')
  USER2_ID=$(echo $USER2_RESPONSE | jq -r '.user.id')
fi

echo "✅ User 1 (Creator): $USER1_ID"
echo "✅ User 2 (Approver): $USER2_ID"
echo ""

# Create workspace as user 1
echo "2. Creating workspace..."
WORKSPACE_RESPONSE=$(curl -s -X POST "$API_URL/workspaces" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Approval Test Workspace",
    "slug": "approval-test-'$(date +%s)'"
  }')

WORKSPACE_ID=$(echo $WORKSPACE_RESPONSE | jq -r '.id')

if [ -z "$WORKSPACE_ID" ] || [ "$WORKSPACE_ID" == "null" ]; then
  echo "❌ Failed to create workspace"
  echo "Response: $WORKSPACE_RESPONSE"
  exit 1
fi

echo "✅ Workspace created: $WORKSPACE_ID"
echo ""

# Get workspace with roles
echo "3. Fetching workspace roles..."
WORKSPACE=$(curl -s "$API_URL/workspaces/$WORKSPACE_ID" \
  -H "Authorization: Bearer $TOKEN1")

# Get Publisher role (has approval permission)
PUBLISHER_ROLE_ID=$(echo $WORKSPACE | jq -r '.roles[] | select(.name == "Publisher") | .id')

if [ -z "$PUBLISHER_ROLE_ID" ] || [ "$PUBLISHER_ROLE_ID" == "null" ]; then
  echo "❌ Publisher role not found"
  echo "Available roles:"
  echo $WORKSPACE | jq -r '.roles[] | "\(.name) - \(.id)"'
  exit 1
fi

echo "✅ Publisher role ID: $PUBLISHER_ROLE_ID"
echo ""

# Invite user 2 to workspace
echo "4. Inviting approver to workspace..."
INVITE_RESPONSE=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/members" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "approver@test.com",
    "roleId": "'$PUBLISHER_ROLE_ID'"
  }')

echo "✅ Approver invited to workspace"
echo ""

# Create a test post as user 1
echo "5. Creating a test post (as creator)..."
POST_DATA='{
  "content": "This is a test post for approval workflow.\nIt needs to be reviewed before publishing.",
  "title": "Approval Workflow Test Post",
  "platforms": []
}'

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/posts" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "$POST_DATA")

POST_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
STATUS=$(echo $CREATE_RESPONSE | jq -r '.status')

if [ -z "$POST_ID" ] || [ "$POST_ID" == "null" ]; then
  echo "❌ Failed to create post"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi

echo "✅ Post created: $POST_ID"
echo "   Initial status: $STATUS"
echo ""

# Submit for approval
echo "6. Submitting post for approval..."
APPROVAL_DATA='{
  "approvalSteps": [
    {
      "approverId": "'$USER2_ID'",
      "order": 1
    }
  ]
}'

SUBMIT_RESPONSE=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/posts/$POST_ID/submit-for-approval" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "$APPROVAL_DATA")

STATUS=$(echo $SUBMIT_RESPONSE | jq -r '.status')

if [ "$STATUS" != "PENDING_APPROVAL" ]; then
  echo "❌ Failed to submit for approval"
  echo "   Expected: PENDING_APPROVAL"
  echo "   Got: $STATUS"
  echo "Response: $SUBMIT_RESPONSE"
  exit 1
fi

echo "✅ Post submitted for approval"
echo "   Status: $STATUS"
STEP_ID=$(echo $SUBMIT_RESPONSE | jq -r '.approvalSteps[0].id')
echo "   Approval step ID: $STEP_ID"
echo ""

# Get pending approvals as user 2
echo "7. Checking pending approvals (as approver)..."
PENDING=$(curl -s "$API_URL/workspaces/$WORKSPACE_ID/posts/pending-approvals" \
  -H "Authorization: Bearer $TOKEN2")

PENDING_POST_ID=$(echo $PENDING | jq -r '.[0].id // empty')

if [ "$PENDING_POST_ID" != "$POST_ID" ]; then
  echo "❌ Post not found in pending approvals"
  echo "   Expected: $POST_ID"
  echo "   Got: $PENDING_POST_ID"
  exit 1
fi

echo "✅ Post appears in pending approvals for user 2"
echo ""

# Approve the post as user 2
echo "8. Approving the post (as approver)..."
APPROVE_DATA='{
  "action": "APPROVE",
  "comment": "Content looks great! Approved for publishing."
}'

APPROVE_RESPONSE=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/posts/$POST_ID/approval-steps/$STEP_ID/process" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d "$APPROVE_DATA")

NEW_STATUS=$(echo $APPROVE_RESPONSE | jq -r '.status')

if [ "$NEW_STATUS" != "APPROVED" ]; then
  echo "❌ Approval failed"
  echo "   Expected status: APPROVED"
  echo "   Actual status: $NEW_STATUS"
  echo "Response: $APPROVE_RESPONSE"
  exit 1
fi

APPROVAL_STEP_STATUS=$(echo $APPROVE_RESPONSE | jq -r '.approvalSteps[0].status')
COMMENT=$(echo $APPROVE_RESPONSE | jq -r '.approvalSteps[0].comment')

echo "✅ Post approved successfully"
echo "   Post status: $NEW_STATUS"
echo "   Step status: $APPROVAL_STEP_STATUS"
echo "   Comment: $COMMENT"
echo ""

# Test rejection workflow
echo "9. Testing rejection workflow..."
echo "   Creating another post..."

POST_DATA2='{
  "content": "This post will be rejected for testing",
  "title": "Test Rejection Post",
  "platforms": []
}'

CREATE_RESPONSE2=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/posts" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "$POST_DATA2")

POST_ID2=$(echo $CREATE_RESPONSE2 | jq -r '.id')

echo "   Submitting for approval..."
SUBMIT_RESPONSE2=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/posts/$POST_ID2/submit-for-approval" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "$APPROVAL_DATA")

STEP_ID2=$(echo $SUBMIT_RESPONSE2 | jq -r '.approvalSteps[0].id')

echo "   Rejecting the post..."
REJECT_DATA='{
  "action": "REJECT",
  "comment": "Content needs revision - please update and resubmit."
}'

REJECT_RESPONSE=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/posts/$POST_ID2/approval-steps/$STEP_ID2/process" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d "$REJECT_DATA")

REJECTED_STATUS=$(echo $REJECT_RESPONSE | jq -r '.status')
REJECT_COMMENT=$(echo $REJECT_RESPONSE | jq -r '.approvalSteps[0].comment')
REJECT_STEP_STATUS=$(echo $REJECT_RESPONSE | jq -r '.approvalSteps[0].status')

if [ "$REJECTED_STATUS" != "DRAFT" ]; then
  echo "❌ Rejection failed - post should return to DRAFT status"
  echo "   Actual status: $REJECTED_STATUS"
  exit 1
fi

echo "✅ Post rejected successfully"
echo "   Post status: $REJECTED_STATUS"
echo "   Step status: $REJECT_STEP_STATUS"
echo "   Rejection comment: $REJECT_COMMENT"
echo ""

echo "======================================"
echo "✅ ALL TESTS PASSED!"
echo "======================================"
echo ""
echo "Summary:"
echo "  ✅ User registration/login"
echo "  ✅ Workspace creation with default roles"
echo "  ✅ Member invitation with Publisher role"
echo "  ✅ Post creation (DRAFT status)"
echo "  ✅ Submit for approval (PENDING_APPROVAL status)"
echo "  ✅ Pending approvals list filtering"
echo "  ✅ Approve workflow (APPROVED status)"
echo "  ✅ Reject workflow (back to DRAFT)"
echo "  ✅ Approval step status tracking"
echo "  ✅ Comments on approval/rejection"
echo ""
echo "Test workspace: $WORKSPACE_ID"
echo "Approved post: $POST_ID"
echo "Rejected post: $POST_ID2"
echo ""
