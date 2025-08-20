# Project Structure

## Repository Organization
This is a monorepo containing both frontend and backend applications for the Sedori Platform.

## Expected Directory Structure
```
sedori-platform/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Next.js pages/routes
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                  # NestJS API server
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   ├── common/         # Shared utilities
│   │   ├── database/       # Database configuration
│   │   └── main.ts         # Application entry point
│   └── package.json
├── docker-compose.yml        # Development environment
├── docker-compose.prod.yml   # Production environment
└── docs/                    # Additional documentation
```

## Database Schema Organization
- **Users**: User accounts and authentication
- **Products**: Product catalog and sourcing data
- **Sales**: Transaction and profit tracking
- **Recommendations**: AI-generated suggestions

## Naming Conventions
- **Files**: kebab-case for files and directories
- **Components**: PascalCase for React components
- **Variables**: camelCase for JavaScript/TypeScript
- **Database**: snake_case for table and column names
- **API Endpoints**: RESTful naming with plural nouns

## Module Organization
- Each feature should be organized as a self-contained module
- Shared utilities go in `common/` directories
- Database entities and migrations in dedicated `database/` folder
- API routes follow resource-based naming (e.g., `/api/products`, `/api/users`)

## Configuration Management
- Environment-specific configs in `.env` files
- Docker Compose for service orchestration
- Separate configurations for development and production