# Multi-stage build for production optimization
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache curl dumb-init

# Create app directory and user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

WORKDIR /app

# Development stage
FROM base AS dev
COPY package*.json ./
RUN npm ci
COPY . .
RUN chown -R nestjs:nodejs /app
EXPOSE 3000
USER nestjs
CMD ["npm", "run", "start:dev"]

# Build stage for production
FROM base AS development
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage  
FROM base AS production

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from development stage
COPY --from=development /app/dist ./dist

# Copy necessary files
COPY --from=development /app/node_modules/@nestjs ./node_modules/@nestjs

# Change ownership to nodejs user
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main"]