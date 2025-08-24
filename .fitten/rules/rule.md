# Project Context Understanding Rules

## Architectural Patterns
1. This is a NestJS backend application following modular architecture
2. Each domain (auth, user, absence) has its own module with:
   - Controller
   - Service 
   - Entity
   - DTOs
   - Module file

## Key Technologies
1. Backend: NestJS with TypeScript
2. Database: TypeORM (MySQL/PostgreSQL)
3. Authentication: JWT strategy
4. API Documentation: Swagger
5. Internationalization: i18n
6. Validation: class-validator

## Common Conventions
1. DTOs are located in `dtos` subdirectories
2. Entities extend `AbstractEntity`
3. Services extend `AbstractService` when applicable
4. Uses decorators extensively for:
   - Routing
   - Validation
   - Swagger documentation
   - Authentication

## Module Relationships
1. SharedModule provides common services
2. AuthModule handles authentication
3. UserModule manages user data
4. AbsenceModule handles absence tracking
5. HealthCheckerModule provides system health status

## Important Files
1. `src/main.ts` - Application entry point
2. `src/app.module.ts` - Root module
3. `src/ormconfig.ts` - Database configuration
4. `src/setup-swagger.ts` - API documentation setup
5. `src/constants/role-type.ts` - User role definitions
