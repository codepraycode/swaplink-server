# Unified Dockerfile for SwapLink Server (API & Worker)
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
# Install pnpm and openssl
RUN apk add --no-cache openssl && npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (frozen lockfile for consistency)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN pnpm db:generate

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Prune dev dependencies to keep image small
ENV CI=true
RUN pnpm prune --prod

# --- Runner Stage ---
FROM node:18-alpine AS runner

WORKDIR /app

# Install openssl
RUN apk add --no-cache openssl

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy production node_modules from builder (preserves pnpm structure and Prisma client)
COPY --from=builder /app/node_modules ./node_modules

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose API port
EXPOSE 3000

RUN npm run db:deploy

# Default command (can be overridden in docker-compose)
CMD ["node", "dist/api/server.js"]
