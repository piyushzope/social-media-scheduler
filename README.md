# Social Media Scheduler

A web application that enables users to schedule and publish posts across multiple social media platforms (Meta, X, LinkedIn, TikTok) from a single dashboard.

## Tech Stack

- **Frontend**: Next.js 14 (React) with Tailwind CSS
- **API**: NestJS (TypeScript)
- **Scheduler**: Go
- **Database**: PostgreSQL
- **Cache/Queue**: Redis
- **Deployment**: Docker + Kubernetes

## Project Structure

```
SocialMediaApp/
├── apps/
│   ├── web/                    # Next.js frontend
│   └── api/                    # NestJS API
├── services/
│   └── scheduler/              # Go scheduler service
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── shared-types/           # TypeScript types
│   ├── ui/                     # Shared React components
│   └── config/                 # ESLint & TypeScript configs
├── infra/
│   └── kubernetes/             # K8s manifests
├── docker-compose.yml
└── spec.md                     # Product specification
```

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Go >= 1.22 (for scheduler)
- Docker & Docker Compose
- PostgreSQL 16+ (or use Docker)
- Redis 7+ (or use Docker)

## Getting Started

### 1. Clone and Install

```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm install
```

### 2. Set Up Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values (database URL, API keys, etc.)
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis
```

### 4. Set Up Database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate
```

### 5. Run Development Servers

```bash
# Run all services (web + api)
pnpm dev

# Or run individually:
pnpm --filter @social/web dev      # Frontend: http://localhost:3000
pnpm --filter @social/api dev      # API: http://localhost:4000

# For scheduler (Go):
cd services/scheduler
go run ./cmd/scheduler
```

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run tests |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:push` | Push schema changes (dev only) |

### Adding New Packages

```bash
# Create a new package in packages/
mkdir packages/my-package
cd packages/my-package
pnpm init
```

### API Documentation

When running in development mode, Swagger docs are available at:
- http://localhost:4000/docs

## Deployment

### Docker Build

```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Push to registry
docker-compose -f docker-compose.prod.yml push
```

### Kubernetes

```bash
# Deploy to dev
kubectl apply -k infra/kubernetes/overlays/dev

# Deploy to production
kubectl apply -k infra/kubernetes/overlays/prod
```

## Architecture

### Services

1. **Web (Next.js)**: Frontend application
   - Server-side rendering
   - API route proxying
   - Real-time collaboration (WebSocket)

2. **API (NestJS)**: REST API gateway
   - Authentication (JWT)
   - CRUD operations
   - OAuth integrations
   - AI content generation

3. **Scheduler (Go)**: Background job processor
   - Queue processing (Redis)
   - Platform API publishing
   - Retry handling
   - Priority queuing

### Database Schema

See `packages/database/prisma/schema.prisma` for the full schema.

Key models:
- `User` / `Workspace` / `Role` - Multi-tenant user management
- `PlatformAccount` - Connected social media accounts
- `Post` / `PostPlatformConfig` - Posts and platform-specific settings
- `AuditLog` - Immutable audit trail

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `META_CLIENT_ID/SECRET` | Meta OAuth credentials |
| `X_CLIENT_ID/SECRET` | X (Twitter) OAuth credentials |
| `LINKEDIN_CLIENT_ID/SECRET` | LinkedIn OAuth credentials |
| `TIKTOK_CLIENT_ID/SECRET` | TikTok OAuth credentials |
| `OPENAI_API_KEY` | OpenAI API key for AI features |

## Contributing

1. Create a feature branch
2. Make changes
3. Run `pnpm lint` and `pnpm test`
4. Submit a pull request

## License

Private - All rights reserved
