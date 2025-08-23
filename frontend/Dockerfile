# Multi-stage build for frontend
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies based on the preferred package manager
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Development stage
FROM base AS dev
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci

COPY . .

# Expose port and run in development mode  
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Production builder stage
FROM base AS builder
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Production stage
FROM base AS production
RUN apk add --no-cache libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["node", "server.js"]