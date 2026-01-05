# Social Media Scheduling Web Application

## Overview

A web application that enables users to schedule and publish posts across multiple social media platforms from a single dashboard, with AI-powered content creation, compliance features, and unified analytics.

**Target Users:** Marketing agencies, social media managers, and businesses managing multiple social accounts across regulated and non-regulated industries.

**Timeline:** 6-month full v1 release

---

## Platform Requirements

### Supported Platforms (v1 - Hard Requirement)

All four platforms must be integrated before launch. Missing any platform blocks release.

| Platform | API Requirements | Known Risks |
|----------|------------------|-------------|
| Meta (Facebook/Instagram) | Meta Business API, app review required (4-8 weeks) | App review delays |
| X (Twitter) | API v2 with Pro tier ($5,000+/month) | Cost, API instability |
| LinkedIn | Marketing API with partner approval | Publishing rate limits |
| TikTok | Content Posting API (invite-only, business verification) | Access may be denied |

### Platform Abstraction

Design the system with a platform abstraction layer from day one to:
- Gracefully handle platforms that become unavailable
- Enable future platform additions without architectural changes
- Isolate platform-specific logic (character limits, media requirements, API quirks)

---

## Core Features

### 1. Content Planning & Scheduling

#### Calendar View
- **Desktop-first design** with full calendar (week/month views)
- **Mobile:** Simplified list view (not full calendar)
- **Filtering:** By platform, with basic filter controls
- Posts displayed with platform icons, scheduled time, and status

#### Timezone Handling
- **Per-account configured timezone** (not browser-based)
- Users set timezone when connecting each social account
- All times displayed in account's configured timezone
- DST transitions handled automatically by storing in UTC internally

#### Scheduling SLA
- **Paid tiers:** Exact-time guarantee with priority queue placement
- **Free tier:** Best-effort, may be delayed during high-traffic periods
- Posts queued with priority score based on tier + scheduled time

### 2. AI-Powered Content Creation

#### Capabilities
- Generate/suggest text content optimized per platform
- Generate images via AI (user must configure external storage destination first)
- Generate video content suggestions
- Suggest hashtags, formatting, and optimal posting times

#### Constraints
- **Mandatory human review** - AI never auto-publishes
- AI outputs saved directly to user's configured external storage (S3, GCS, etc.)
- Users cannot use AI image/video generation until storage is configured

#### Success Criteria
- AI suggestions must comply with platform-specific best practices:
  - Character limits respected
  - Hashtag norms followed
  - Media dimension requirements met
  - Platform-specific formatting applied
- NOT measured by engagement metrics for v1

#### Brand Voice Configuration
- **Examples:** User provides 10-20 sample responses for tone learning
- **Rules:** Explicit guidelines document (e.g., "never discuss pricing", "always use formal tone")
- Both combined: examples inform tone, rules enforce hard constraints
- AI suggestions validated against rules before presentation

### 3. Automated Content Generation (Blog Monitoring)

#### Detection Method
- **Primary:** Webhooks for instant detection (if user's platform supports)
- **Fallback:** RSS feed polling every 15-30 minutes
- User configures blog URL and detection method during setup

#### Content Processing
- **New content only** - historical backlog not processed on initial setup
- AI generates platform-appropriate summaries/teasers from blog content

#### Edit Detection
- System re-checks source content **1 hour before scheduled post time**
- If source has changed, regenerate and flag for user review
- User notified: "Source content changed, please review updated post"

### 4. Engagement Management

#### Unified Inbox
- Comments and messages from all platforms in single view
- Respond directly from the app

#### Volume Handling
- **Normal volume:** Show all engagement
- **High volume (viral posts):** Show representative sample
- Threshold: Configure per account (default: >1,000 items/hour triggers sampling)
- Sampling prioritizes: questions, verified accounts, negative sentiment

#### AI Response Suggestions
- Suggestions aligned with configured brand voice
- Templates available for common response types
- Human always approves before sending

### 5. Marketing Strategy Assistance

#### Recommendations Source
- LLM knowledge base (note: has training cutoff)
- User engagement feedback loop improves relevance over time
- Industry-specific guidance based on account categorization

#### Scope
- Posting time optimization
- Content type recommendations
- Hashtag strategies
- Audience growth tactics

### 6. Unified Analytics & Insights

#### Data Aggregation
- Metrics from all connected platforms in single dashboard
- **Freshness handling:** Display all available data with per-platform "last updated" timestamps
- Do NOT wait for all platforms to align

#### Metrics Tracked
- Reach, impressions, engagement rate
- Follower growth
- Click-through rates
- Platform-specific metrics (retweets, shares, saves, etc.)

#### Recommendations
- Actionable suggestions based on performance data
- Powered by LLM analysis of metrics + industry patterns

---

## Collaboration & Permissions

### Real-Time Collaboration
- **Google Docs-style** simultaneous editing
- Live cursors showing other editors
- Changes merge automatically
- Conflict-free replicated data types (CRDTs) or operational transforms required

### Permission Model

#### Custom Role Builder
- Admins create custom roles with granular permissions
- Permissions include:
  - View content (drafts, scheduled, published)
  - Create/edit content
  - Delete content
  - Approve content
  - Publish content
  - Manage team members
  - View analytics
  - Configure integrations
  - Manage billing

#### Default Roles (Pre-configured)
- **Viewer:** Analytics and published content only
- **Creator:** Create and edit drafts, cannot publish
- **Publisher:** Full content control, cannot manage team
- **Admin:** Full access

### Approval Workflows

#### Structure
- **Linear chain only** (sequential approval)
- Example: Creator → Reviewer → Publisher
- Configurable chain length per account/workspace

#### Delegation
- Approvers can delegate to specific users during absence
- Delegation has start/end dates
- Delegated approvals logged with original approver noted

#### Behavior
- Post cannot publish until all approvals obtained
- Approver notified via email and in-app
- If approval not received by scheduled time, post is held (not auto-published)

---

## Security & Compliance

### Authentication & Authorization

#### Social Account Connection
- **OAuth only** - system never stores social media passwords
- Users authenticate directly with each platform
- Tokens refreshed automatically; expired tokens prompt re-authentication

#### User Authentication
- Email/password with secure hashing
- Optional SSO integration (SAML/OIDC) for enterprise

### Audit Logging

#### Immutable Logs
- All actions logged with:
  - Timestamp (UTC)
  - User ID
  - Action type
  - Affected resource
  - Before/after state (for edits)
  - IP address
  - User agent
- Logs cannot be deleted or modified by any user (including admins)
- Retention: Minimum 7 years for compliance

#### Exportable
- Logs exportable in standard formats (JSON, CSV)
- API access for SIEM integration

### Data Residency

#### v1 Scope
- **US-only** data residency
- All data stored in US-based infrastructure
- Documented for future EU expansion

### Compliance Features

#### Content Archival
- All published content archived with metadata
- Includes: content, media URLs, publish time, platform, engagement snapshot
- Retention configurable per workspace (default: 7 years)

#### Approval Audit Trail
- Full history of approval chain for each post
- Who approved, when, any comments

---

## Failure Handling

### Differentiated Error Handling

| Failure Type | Detection | Action | User Notification |
|--------------|-----------|--------|-------------------|
| OAuth token expired | Pre-publish check | Pause post, prompt reauth | Immediate: "Reconnect your [platform] account" |
| Platform outage | API error codes | Retry with exponential backoff (max 3 attempts over 15 min) | After final failure: "Platform unavailable" |
| Content policy violation | Platform rejection | No retry | Immediate: "[Platform] rejected: [reason]" |
| System crash | Health checks | Auto-recovery, process queue | If posts missed: "Some posts delayed due to system issue" |
| Rate limiting | API response | Queue with backoff | Silent unless SLA breached |

### Platform Rule Changes
- **Approach:** Fail at publish time, notify user
- No pre-emptive validation against changing platform rules
- User must manually fix and reschedule rejected posts

### Retry Logic
```
attempt 1: immediate
attempt 2: 2 minutes delay
attempt 3: 10 minutes delay
after 3 failures: mark failed, notify user
```

---

## Media Handling

### Storage Model
- **User-hosted only** - system does not store user media
- Users provide URLs to externally hosted media
- System validates URL accessibility before scheduling

### AI-Generated Media
- User must configure external storage destination (S3, GCS, Azure Blob, etc.)
- Provide: bucket/container, credentials (stored encrypted), path prefix
- AI outputs uploaded directly to user's storage
- URL returned and used in scheduled post

### Supported Formats
Follow each platform's requirements:
- Images: JPG, PNG, GIF (platform-specific size limits)
- Videos: MP4 (platform-specific duration/size limits)
- System validates against platform requirements before scheduling

---

## Pricing Model

### Structure: Feature Tiers + Usage

#### Tiers (Names TBD)
1. **Free/Starter**
   - Limited connected accounts (e.g., 3)
   - Basic scheduling
   - No AI features
   - Best-effort publishing (no SLA)
   - Limited analytics history

2. **Professional**
   - More connected accounts (e.g., 10)
   - AI content suggestions
   - Priority publishing queue
   - Full analytics
   - Basic approval workflows

3. **Enterprise**
   - Unlimited accounts
   - Full AI suite (including image/video)
   - Exact-time SLA
   - Custom roles
   - Full compliance suite
   - Dedicated support

#### Usage Overage
- Posts beyond tier limit charged per-post
- AI generations beyond limit charged per-generation
- Clear usage dashboard and alerts at 80%, 100% thresholds

---

## Observability

### Monitoring Stack

#### Metrics
- Post queue depth and age
- Per-platform success/failure rates
- API latency percentiles (p50, p95, p99)
- Publishing latency (scheduled time vs actual)
- AI generation latency

#### Alerting
- Queue depth exceeding threshold
- Success rate below SLA
- Approaching SLA breach (predictive)
- Platform API errors spiking
- System resource exhaustion

#### Distributed Tracing
- End-to-end trace for each post lifecycle
- Trace ID in all logs
- Spans for: scheduling, queue, API call, confirmation

### On-Call Requirements
- 24/7 coverage for production issues
- Runbooks for common failure scenarios
- Escalation paths defined

---

## Technical Architecture (Prescribed)

### Recommended Stack

#### Backend
- **Language:** TypeScript (Node.js) or Go
  - TypeScript: Better for rapid development, large ecosystem
  - Go: Better for high-concurrency scheduler service
  - Consider: TypeScript for API, Go for scheduler

#### API
- REST for CRUD operations
- WebSocket for real-time collaboration
- GraphQL optional for complex analytics queries

#### Database
- **Primary:** PostgreSQL
  - Relational data (users, accounts, posts)
  - Strong consistency for approval workflows
- **Cache:** Redis
  - Session storage
  - Rate limiting counters
  - Queue metadata
- **Search:** Elasticsearch (optional)
  - Analytics aggregation
  - Content search

#### Queue
- **Primary:** Redis Streams or RabbitMQ
- **Alternative:** AWS SQS for managed option
- Must support: delayed messages, priority queuing, dead letter queue

#### Real-Time Collaboration
- **Options:**
  - Yjs + WebSocket for CRDT-based collaboration
  - ShareDB for OT-based approach
- Requires WebSocket infrastructure (consider Socket.io or native WS)

#### Storage
- User media: External (user-provided)
- AI outputs: User-configured cloud storage
- Audit logs: Append-only storage (consider S3 with Object Lock)

#### AI Integration
- OpenAI API for text generation
- DALL-E or Stable Diffusion API for image generation
- Consider: Anthropic Claude for longer-form content

#### Infrastructure
- **Compute:** Kubernetes or ECS for container orchestration
- **CDN:** CloudFront or Cloudflare for static assets
- **Secrets:** AWS Secrets Manager or HashiCorp Vault

### Architecture Diagram (Conceptual)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web App   │────▶│   API GW    │────▶│  Auth Svc   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Post Svc   │     │  AI Svc     │     │Analytics Svc│
└─────────────┘     └─────────────┘     └─────────────┘
         │                 │
         ▼                 ▼
┌─────────────┐     ┌─────────────┐
│  Scheduler  │     │  User Cloud │
│   (Queue)   │     │   Storage   │
└─────────────┘     └─────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Platform APIs (Meta, X, etc.)          │
└─────────────────────────────────────────────────────┘
```

---

## Open Questions & Risks

### Critical Risks

1. **TikTok API Access**
   - Invite-only, business verification required
   - Mitigation: Begin application process immediately
   - Contingency: If denied, evaluate launch with 3 platforms

2. **X API Cost**
   - $5,000+/month for posting access
   - Must be factored into pricing model
   - Ensure unit economics work

3. **Real-Time Collaboration Complexity**
   - CRDT/OT implementation is non-trivial
   - Affects: calendar editing, post editing
   - Consider: Phase this feature if timeline at risk

### Open Decisions

1. **Specific tier pricing and limits** - requires market research
2. **AI provider selection** - OpenAI vs alternatives, cost analysis needed
3. **Exact sampling algorithm** for high-volume engagement
4. **SSO providers** to support (Okta, Auth0, Google Workspace, etc.)

### Future Scope (Explicitly Not v1)

- EU data residency
- Additional platforms beyond core 4
- Native mobile apps
- White-label/reseller model
- Advanced workflow builder (non-linear approvals)
- Historical blog content processing

---

## Acceptance Criteria

### Feature Complete When:

1. **Scheduling**
   - User can schedule post to any of 4 platforms
   - Post publishes within SLA window
   - Timezone correctly applied
   - Calendar displays all scheduled posts with filters

2. **AI Content**
   - AI generates text suggestions within platform limits
   - AI generates images to user's storage
   - Human review gate enforced
   - Brand voice configuration functional

3. **Blog Monitoring**
   - RSS detection within 30 minutes
   - Webhook detection within 1 minute
   - Edit detection re-check works
   - Generated posts flagged for review

4. **Engagement**
   - Comments/messages appear in unified inbox
   - Responses can be sent from app
   - AI suggestions appear (when enabled)
   - High-volume sampling functional

5. **Analytics**
   - Metrics from all platforms displayed
   - Freshness indicators accurate
   - Data refreshes on reasonable cadence

6. **Collaboration**
   - Multiple users can edit simultaneously
   - Changes merge without conflict
   - Role permissions enforced
   - Approval workflows functional

7. **Compliance**
   - Audit logs capture all actions
   - Logs are immutable
   - Approval history preserved
   - Content archived post-publish

8. **Operations**
   - Observability stack deployed
   - Alerts firing correctly
   - On-call rotation established
   - Runbooks documented

---

## Glossary

- **OAuth:** Open standard for token-based authentication
- **CRDT:** Conflict-free Replicated Data Type (for real-time collaboration)
- **OT:** Operational Transformation (alternative to CRDT)
- **SLA:** Service Level Agreement
- **Dead Letter Queue:** Queue for failed messages that exceeded retry limits
