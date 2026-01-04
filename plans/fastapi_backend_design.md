# Unified Python Backend Architecture Design - FastAPI

## Overview
This document outlines the design for a unified Python backend using FastAPI, replacing the current dual-system setup (JavaScript Vercel serverless functions + Python scripts). The new architecture maintains full compatibility with existing endpoints while providing a modern, scalable, and maintainable solution.

## 1. Framework Choice: FastAPI

**Justification:**
- **Modern Python Web Framework**: Built on Starlette and Pydantic, provides automatic API documentation, validation, and async support
- **Performance**: Asynchronous by default, excellent for I/O-bound operations like database queries
- **Developer Experience**: Auto-generated OpenAPI/Swagger docs, type hints, dependency injection
- **Ecosystem**: Rich ecosystem of middleware, authentication libraries, and deployment options
- **Scalability**: Suitable for both development and production deployments

**Key Benefits over Current Setup:**
- Single codebase instead of dual JavaScript/Python
- Better error handling and validation with Pydantic
- Automatic API documentation
- Easier testing and debugging
- Consistent async patterns

## 2. Authentication Strategy: JWT-Based

**Implementation:**
- **Library**: `python-jose[cryptography]` for JWT encoding/decoding
- **Password Hashing**: `passlib` with bcrypt
- **Token Structure**: `{userId, name, email}` matching current implementation
- **Expiration**: 24 hours
- **Middleware**: FastAPI dependency injection for authentication

**Security Features:**
- Bearer token in Authorization header
- Automatic token validation on protected routes
- User context injection into request handlers

## 3. Database Integration: Supabase with supabase-py

**Client Configuration:**
- **User Client**: Uses `SUPABASE_ANON_KEY` for standard operations
- **Admin Client**: Uses `SUPABASE_SERVICE_ROLE_KEY` for administrative tasks
- **Connection Management**: Singleton client instances with connection pooling

**Schema Handling:**
- **Automatic Table Creation**: On application startup, verify/create tables if not exist
- **Migration Support**: Use existing `supabase_schema.sql` and `supabase_functions.sql`
- **RLS Compliance**: Respect Row Level Security policies

## 4. API Endpoint Structure

**Mirroring Current Endpoints:**

### Authentication Routes (`/api/auth`)
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/register` - User registration with username/password
- `GET /api/auth/me` - Get current user info (JWT required)
- `POST /api/auth/logout` - Client-side logout

### Data Routes
- `GET /api/categories` - List all categories
- `GET /api/payment-methods` - List all payment methods
- `GET /api/expenses` - Get expenses with filtering (JWT required)
- `POST /api/expenses` - Add new expense (JWT required)

### Dashboard Routes (`/api/dashboard`)
- `GET /api/dashboard/users` - List all users (JWT required)
- `GET /api/dashboard/{user_id}/monthly` - Monthly dashboard data (JWT required)
- `GET /api/dashboard/{user_id}/yearly` - Yearly dashboard data (JWT required)

**Response Formats:** Match current JSON structures exactly for frontend compatibility.

## 5. Database Schema Handling

**Tables:** users, categories, payment_methods, expenses (as per `supabase_schema.sql`)

**Functions:** RPC functions for dashboard aggregations (as per `supabase_functions.sql`)

**Initialization:**
- On startup, check table existence
- Create tables/functions if missing using psycopg2 connection
- Maintain data integrity and RLS policies

## 6. CORS and Middleware Configuration

**CORS Middleware:**
- **fastapi.middleware.cors.CORSMiddleware**
- **Allowed Origins**: Configurable via `CORS_ORIGINS` env var
- **Credentials**: True for cookie/auth support
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

**Additional Middleware:**
- **Request Logging**: Track API usage
- **Error Handling**: Consistent error responses
- **Rate Limiting**: Optional, configurable

## 7. Environment Variable Management

**Required Variables:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Anonymous key for user operations
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `JWT_SECRET` - Secret key for JWT signing
- `CORS_ORIGINS` - Comma-separated allowed origins
- `DATABASE_URL` - PostgreSQL connection string for schema operations

**Configuration Class:**
- Use `pydantic.BaseSettings` for validation and defaults
- Environment-specific configs (dev/prod)

## 8. Deployment Considerations

**Platform Options:**
- **Railway**: Excellent FastAPI support, PostgreSQL integration
- **Render**: Managed FastAPI deployment with auto-scaling
- **Heroku**: Traditional option with Procfile support
- **Docker**: Containerized deployment for flexibility

**Production Setup:**
- **ASGI Server**: Gunicorn + Uvicorn workers
- **Process Management**: systemd or container orchestration
- **SSL/TLS**: Platform-provided certificates
- **Monitoring**: Application logs, health checks
- **Scaling**: Horizontal scaling with load balancer

**Docker Configuration:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Application Architecture

```
family-financial-backend/
├── main.py                 # FastAPI application instance
├── config.py              # Environment configuration
├── database.py            # Supabase client setup
├── auth.py                # Authentication utilities
├── models.py              # Pydantic models
├── routers/
│   ├── auth.py           # Authentication routes
│   ├── expenses.py       # Expense management
│   ├── dashboard.py      # Dashboard data
│   └── categories.py     # Categories/payment methods
├── middleware/
│   └── auth.py           # JWT middleware
├── utils/
│   └── database.py       # Schema initialization
└── requirements.txt      # Python dependencies
```

## Dependencies

**Core:**
- fastapi==0.104.1
- uvicorn[standard]==0.24.0
- pydantic==2.5.0
- pydantic-settings==2.1.0

**Database:**
- supabase==2.3.0
- psycopg2-binary==2.9.9

**Authentication:**
- python-jose[cryptography]==3.3.0
- passlib[bcrypt]==1.7.4

**Additional:**
- python-multipart==0.0.6
- python-dotenv==1.0.0

## Migration Strategy

**Phase 1: Parallel Deployment**
1. Deploy FastAPI application alongside existing Vercel functions
2. Configure separate domain/subdomain for new API
3. Test all endpoints against current functionality

**Phase 2: Frontend Migration**
1. Update frontend API calls to new FastAPI endpoints
2. Maintain backward compatibility during transition
3. Test authentication flow thoroughly

**Phase 3: Data Migration**
1. Verify data integrity in Supabase
2. Run schema validation scripts
3. Test dashboard aggregations

**Phase 4: Production Cutover**
1. Update DNS/load balancer to route to FastAPI
2. Monitor for errors and performance
3. Decommission Vercel functions

**Rollback Plan:**
- Keep Vercel functions active during transition
- Ability to switch back to old endpoints if issues arise

## Implementation Notes

**Key Considerations:**
- Maintain exact API contract for frontend compatibility
- Preserve all business logic from JavaScript implementation
- Ensure proper error handling and logging
- Implement comprehensive testing (unit, integration)
- Document API with OpenAPI specifications

**Performance Optimizations:**
- Database connection pooling
- Query optimization for dashboard aggregations
- Caching strategies for static data (categories, payment methods)
- Async database operations

**Security Measures:**
- Input validation with Pydantic
- SQL injection prevention via Supabase client
- JWT token validation
- CORS policy enforcement
- Rate limiting on authentication endpoints

This design provides a solid foundation for a unified, maintainable backend while ensuring compatibility with the existing frontend and data architecture.