---
description: Repository Information Overview
alwaysApply: true
---

# HRIS Backend Information

## Summary
A NestJS-based backend application for Human Resource Information System (HRIS). Built with TypeScript, this project supports multiple runtimes (Node.js, Deno, Bun) and follows modern development practices with comprehensive testing, documentation, and containerization.

## Structure
- **src/**: Main application source code with NestJS modules
- **test/**: End-to-end tests
- **dist/**: Compiled JavaScript output
- **docs/**: Project documentation
- **.zencoder/**: Zencoder configuration
- **scripts/**: Utility scripts

## Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.9.2
**Node Version**: >=22.0.0
**Build System**: NestJS CLI
**Package Manager**: Yarn 1.22.22

## Dependencies
**Main Dependencies**:
- NestJS v11.1.3 (core framework)
- TypeORM 0.3.20 (database ORM)
- PostgreSQL (database)
- Passport/JWT (authentication)
- nestjs-i18n (internationalization)
- class-validator/transformer (validation)

**Development Dependencies**:
- Jest (testing)
- ESLint/Prettier (linting)
- SWC (fast TypeScript compilation)
- VuePress (documentation)

## Build & Installation
```bash
# Install dependencies
yarn install

# Development server
yarn start:dev

# Production build
yarn build:prod

# Start production server
yarn start:prod
```

## Docker
**Dockerfile**: Multi-stage build process
**Compose**: PostgreSQL + pgAdmin + Application
**Configuration**: Environment variables via .env file
**Run Command**:
```bash
docker-compose up -d
```

## Database
**Type**: PostgreSQL
**ORM**: TypeORM
**Migrations**:
```bash
# Generate migration
yarn migration:generate <name>

# Run migrations
yarn migration:run
```

## Testing
**Framework**: Jest
**Test Location**: Unit tests in src/, E2E tests in test/
**Naming Convention**: *.spec.ts for unit tests, *.e2e-spec.ts for E2E tests
**Run Command**:
```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e
```

## API Documentation
**Framework**: Swagger/OpenAPI
**URL**: /documentation
**Generation**: Automatic via NestJS decorators
