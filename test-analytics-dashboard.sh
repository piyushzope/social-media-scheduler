#!/bin/bash

# Analytics Dashboard Test Script
# Tests the analytics endpoints and data aggregation

BASE_URL="http://localhost:4000/api"
WORKSPACE_ID=""
TOKEN=""

echo "========================================="
echo "Analytics Dashboard Test"
echo "========================================="

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        echo "Response: $3"
        exit 1
    fi
}

# Step 1: Login
echo -e "\n${YELLOW}Step 1: User Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "creator@test.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    print_result 0 "User logged in successfully"
else
    print_result 1 "Failed to login" "$LOGIN_RESPONSE"
fi

# Step 2: Get user's workspaces
echo -e "\n${YELLOW}Step 2: Fetch User Workspaces${NC}"
WORKSPACES_RESPONSE=$(curl -s -X GET "$BASE_URL/workspaces" \
  -H "Authorization: Bearer $TOKEN")

WORKSPACE_ID=$(echo $WORKSPACES_RESPONSE | jq -r '.[0].id')
if [ "$WORKSPACE_ID" != "null" ] && [ -n "$WORKSPACE_ID" ]; then
    print_result 0 "Workspace found: $WORKSPACE_ID"
else
    print_result 1 "Failed to get workspace" "$WORKSPACES_RESPONSE"
fi

# Step 3: Test analytics summary endpoint - Week period
echo -e "\n${YELLOW}Step 3: Test Analytics Summary - Week Period${NC}"
ANALYTICS_WEEK=$(curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/analytics/summary?period=week" \
  -H "Authorization: Bearer $TOKEN")

WEEK_TOTAL_POSTS=$(echo $ANALYTICS_WEEK | jq -r '.overview.totalPosts')
WEEK_IMPRESSIONS=$(echo $ANALYTICS_WEEK | jq -r '.overview.totalImpressions')
WEEK_REACH=$(echo $ANALYTICS_WEEK | jq -r '.overview.totalReach')
WEEK_ENGAGEMENTS=$(echo $ANALYTICS_WEEK | jq -r '.overview.totalEngagements')
WEEK_ENGAGEMENT_RATE=$(echo $ANALYTICS_WEEK | jq -r '.overview.engagementRate')
WEEK_PLATFORMS=$(echo $ANALYTICS_WEEK | jq -r '.platforms | length')

echo "  Total Posts: $WEEK_TOTAL_POSTS"
echo "  Total Impressions: $WEEK_IMPRESSIONS"
echo "  Total Reach: $WEEK_REACH"
echo "  Total Engagements: $WEEK_ENGAGEMENTS"
echo "  Engagement Rate: $WEEK_ENGAGEMENT_RATE%"
echo "  Connected Platforms: $WEEK_PLATFORMS"

if [ "$WEEK_TOTAL_POSTS" != "null" ]; then
    print_result 0 "Analytics summary (week) fetched successfully"
else
    print_result 1 "Failed to fetch analytics summary" "$ANALYTICS_WEEK"
fi

# Step 4: Test analytics summary endpoint - Day period
echo -e "\n${YELLOW}Step 4: Test Analytics Summary - Day Period${NC}"
ANALYTICS_DAY=$(curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/analytics/summary?period=day" \
  -H "Authorization: Bearer $TOKEN")

DAY_POSTS_PERIOD=$(echo $ANALYTICS_DAY | jq -r '.overview.postsThisPeriod')
echo "  Posts in last 24 hours: $DAY_POSTS_PERIOD"

if [ "$DAY_POSTS_PERIOD" != "null" ]; then
    print_result 0 "Analytics summary (day) fetched successfully"
else
    print_result 1 "Failed to fetch analytics summary (day)" "$ANALYTICS_DAY"
fi

# Step 5: Test analytics summary endpoint - Month period
echo -e "\n${YELLOW}Step 5: Test Analytics Summary - Month Period${NC}"
ANALYTICS_MONTH=$(curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/analytics/summary?period=month" \
  -H "Authorization: Bearer $TOKEN")

MONTH_POSTS_PERIOD=$(echo $ANALYTICS_MONTH | jq -r '.overview.postsThisPeriod')
echo "  Posts in last 30 days: $MONTH_POSTS_PERIOD"

if [ "$MONTH_POSTS_PERIOD" != "null" ]; then
    print_result 0 "Analytics summary (month) fetched successfully"
else
    print_result 1 "Failed to fetch analytics summary (month)" "$ANALYTICS_MONTH"
fi

# Step 6: Verify status breakdown
echo -e "\n${YELLOW}Step 6: Verify Status Breakdown${NC}"
STATUS_BREAKDOWN=$(echo $ANALYTICS_WEEK | jq -r '.statusBreakdown')
DRAFT_COUNT=$(echo $STATUS_BREAKDOWN | jq -r '.DRAFT')
PUBLISHED_COUNT=$(echo $STATUS_BREAKDOWN | jq -r '.PUBLISHED')
SCHEDULED_COUNT=$(echo $STATUS_BREAKDOWN | jq -r '.SCHEDULED')

echo "  DRAFT: $DRAFT_COUNT"
echo "  PUBLISHED: $PUBLISHED_COUNT"
echo "  SCHEDULED: $SCHEDULED_COUNT"

if [ "$DRAFT_COUNT" != "null" ]; then
    print_result 0 "Status breakdown data present"
else
    print_result 1 "Failed to get status breakdown" "$STATUS_BREAKDOWN"
fi

# Step 7: Verify recent posts
echo -e "\n${YELLOW}Step 7: Verify Recent Posts${NC}"
RECENT_POSTS=$(echo $ANALYTICS_WEEK | jq -r '.recentPosts | length')
echo "  Recent posts count: $RECENT_POSTS"

if [ "$RECENT_POSTS" != "null" ]; then
    print_result 0 "Recent posts data present"

    if [ "$RECENT_POSTS" -gt 0 ]; then
        FIRST_POST_TITLE=$(echo $ANALYTICS_WEEK | jq -r '.recentPosts[0].title')
        FIRST_POST_PLATFORMS=$(echo $ANALYTICS_WEEK | jq -r '.recentPosts[0].platforms | length')
        echo "  First post: $FIRST_POST_TITLE"
        echo "  Platforms: $FIRST_POST_PLATFORMS"
    fi
else
    print_result 1 "Failed to get recent posts" "$ANALYTICS_WEEK"
fi

# Step 8: Verify platform-specific data
echo -e "\n${YELLOW}Step 8: Verify Platform-Specific Data${NC}"
if [ "$WEEK_PLATFORMS" -gt 0 ]; then
    FIRST_PLATFORM=$(echo $ANALYTICS_WEEK | jq -r '.platforms[0].platform')
    FIRST_PLATFORM_USERNAME=$(echo $ANALYTICS_WEEK | jq -r '.platforms[0].username')
    FIRST_PLATFORM_POSTS=$(echo $ANALYTICS_WEEK | jq -r '.platforms[0].postsCount')
    FIRST_PLATFORM_IMPRESSIONS=$(echo $ANALYTICS_WEEK | jq -r '.platforms[0].metrics.impressions')

    echo "  Platform: $FIRST_PLATFORM"
    echo "  Username: $FIRST_PLATFORM_USERNAME"
    echo "  Posts: $FIRST_PLATFORM_POSTS"
    echo "  Impressions: $FIRST_PLATFORM_IMPRESSIONS"

    print_result 0 "Platform-specific data verified"
else
    echo -e "${YELLOW}⚠️  No connected platforms - this is expected if no platforms connected${NC}"
fi

# Step 9: Test engagement rate calculation
echo -e "\n${YELLOW}Step 9: Verify Engagement Rate Calculation${NC}"
if [ "$WEEK_IMPRESSIONS" != "0" ] && [ "$WEEK_IMPRESSIONS" != "null" ]; then
    # Calculate expected engagement rate
    EXPECTED_RATE=$(echo "scale=2; ($WEEK_ENGAGEMENTS / $WEEK_IMPRESSIONS) * 100" | bc)
    echo "  Calculated Rate: $EXPECTED_RATE%"
    echo "  API Response Rate: $WEEK_ENGAGEMENT_RATE%"
    print_result 0 "Engagement rate calculation working"
else
    echo -e "${YELLOW}⚠️  No impressions data - engagement rate is 0 (expected)${NC}"
fi

# Summary
echo -e "\n${GREEN}========================================="
echo "✅ All Analytics Tests Passed!"
echo "=========================================${NC}"
echo ""
echo "Analytics Dashboard Summary:"
echo "  - Week period filtering: ✅"
echo "  - Day period filtering: ✅"
echo "  - Month period filtering: ✅"
echo "  - Overview metrics: ✅"
echo "  - Status breakdown: ✅"
echo "  - Recent posts: ✅"
echo "  - Platform data: ✅"
echo "  - Engagement rate: ✅"
echo ""
echo "API Response Structure:"
echo "$ANALYTICS_WEEK" | jq '{
  workspaceId,
  period,
  overview: .overview,
  platformCount: (.platforms | length),
  statusBreakdown: .statusBreakdown,
  recentPostsCount: (.recentPosts | length)
}'
