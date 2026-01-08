FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/eslint/package.json ./packages/config/eslint/
COPY packages/config/typescript/package.json ./packages/config/typescript/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @social/shared-types build
RUN pnpm --filter @social/database generate
RUN pnpm --filter @social/database build
RUN pnpm --filter @social/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy package files for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/eslint/package.json ./packages/config/eslint/
COPY packages/config/typescript/package.json ./packages/config/typescript/
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Install production dependencies with correct native modules for this platform
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client for this platform
RUN pnpm --filter @social/database exec prisma generate

# Copy built assets
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy shared packages (compiled TypeScript)
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json

RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 4000
ENV PORT=4000

WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
