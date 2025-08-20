# Technology Stack

## Architecture
- **Frontend**: Next.js (static distribution)
- **Backend**: NestJS (API server)
- **Database**: PostgreSQL
- **Search**: Meilisearch
- **Cache**: Redis
- **Storage**: MinIO (S3-compatible)
- **Reverse Proxy**: Caddy
- **Monitoring**: Prometheus + Grafana
- **Logging**: Loki + Promtail
- **Infrastructure**: Proxmox (Docker Compose on single VM)

## Development Environment
- **Containerization**: Docker Compose for local development
- **Authentication**: JWT-based authentication
- **Payment Processing**: Stripe/Pay.jp integration
- **API Design**: RESTful APIs with NestJS decorators

## Common Commands
```bash
# Development
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose logs -f        # View logs

# Database
npm run db:migrate           # Run database migrations
npm run db:seed             # Seed database with test data
npm run db:backup           # Create database backup

# Testing
npm run test                # Run unit tests
npm run test:e2e           # Run end-to-end tests
npm run test:coverage      # Generate test coverage report

# Build & Deploy
npm run build              # Build production assets
npm run start:prod         # Start production server
```

## Performance Requirements
- Response time: <1 second (100 concurrent connections)
- Availability: 99.9%
- Security: HTTPS mandatory, SQL injection protection

## Backup Strategy
- Daily: Database dumps
- Weekly: Full VM backups