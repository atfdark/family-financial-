# Supabase Migration Guide

This guide explains how to migrate your family financial management system from SQLite to Supabase.

## What Changed

### Database Schema
- **SQLite**: Used `INTEGER PRIMARY KEY` for auto-incrementing IDs
- **Supabase**: Uses `UUID PRIMARY KEY DEFAULT gen_random_uuid()` for better security and distributed systems

### Authentication
- **SQLite**: Manual session-based authentication with bcrypt
- **Supabase**: Enhanced security with RLS (Row Level Security) policies

### Database Functions
- Added PostgreSQL functions for complex queries (monthly/yearly analytics)
- Functions are marked with `SECURITY DEFINER` to bypass RLS when needed

## Migration Steps

### 1. Database Setup
1. Run the `supabase_schema.sql` script in your Supabase SQL editor to create tables
2. Run the `supabase_functions.sql` script to create database functions
3. The schema includes RLS policies for data security

### 2. Environment Configuration
Update your `.env` file with:
```env
# Remove SQLite configuration
# DATABASE_PATH=./family_financial.db

# Add Supabase configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Dependencies
The following packages were added/updated:
- `@supabase/supabase-js`: Supabase client library
- `uuid`: For UUID generation (if needed)

### 4. Code Changes
- **db.js**: New database connection module using Supabase clients
- **server.js**: Updated all database queries to use Supabase client methods
- **package.json**: Updated dependencies

## Key Differences

### Query Syntax
- **SQLite**: `db.get()`, `db.all()`, `db.run()`
- **Supabase**: `supabase.from().select()`, `supabase.from().insert()`, etc.

### Authentication
- **SQLite**: Manual session management
- **Supabase**: RLS policies ensure users can only access their own data

### Data Types
- **SQLite**: `INTEGER`, `TEXT`, `REAL`
- **Supabase**: `UUID`, `TEXT`, `DECIMAL`, `TIMESTAMP WITH TIME ZONE`

## Testing the Migration

1. Start the server: `npm start`
2. Test basic functionality:
   - User registration/login
   - Adding expenses
   - Viewing dashboards
   - Category and payment method management

## Benefits of Supabase

1. **Scalability**: Cloud-native database that scales automatically
2. **Security**: Built-in RLS policies for data protection
3. **Real-time**: Built-in real-time subscriptions (can be added later)
4. **Authentication**: Supabase Auth integration (can replace session-based auth)
5. **Storage**: Built-in file storage for receipts/documents
6. **Edge Functions**: Serverless functions for complex operations

## Next Steps

Consider implementing:
1. Supabase Auth for better authentication
2. Real-time updates for live dashboard updates
3. File storage for expense receipts
4. Edge functions for complex financial calculations
5. Mobile app using Supabase client libraries