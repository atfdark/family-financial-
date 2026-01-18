import psycopg2
import os
import sqlparse
from config import settings

# TODO: Consider migrating to Alembic for proper DB migrations and stop executing raw multi-statement SQL files directly.

def initialize_database():
    """Initialize database schema if tables don't exist"""
    if not settings.database_url:
        print("DATABASE_URL not configured, skipping schema initialization")
        return

    conn = None
    try:
        # Connect to database with a connect timeout so startup does not hang
        conn = psycopg2.connect(settings.database_url, connect_timeout=5)

        with conn:
            with conn.cursor() as cursor:
                # Check if tables exist
                cursor.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name IN ('users', 'categories', 'payment_methods', 'expenses')
                """)
                existing_tables = [row[0] for row in cursor.fetchall()]

                required_tables = {'users', 'categories', 'payment_methods', 'expenses'}

                if required_tables.issubset(set(existing_tables)):
                    print("All required tables already exist")
                    return

                print("Creating database schema...")

# Read and execute schema files
                schema_files = ['supabase_schema.sql']

                # Verify that all required schema files exist before proceeding
                schema_paths = [os.path.abspath(os.path.join(os.path.dirname(__file__), '..', schema_file)) for schema_file in schema_files]
                missing_paths = [p for p in schema_paths if not os.path.exists(p)]
                if missing_paths:
                    raise FileNotFoundError(
                        "Required schema file(s) not found: "
                        f"{', '.join(missing_paths)}. Expected relative paths: "
                        f"{', '.join([f'../{s}' for s in schema_files])}"
                    )

                for schema_file, schema_path in zip(schema_files, schema_paths):
                    with open(schema_path, 'r') as f:
                        sql_content = f.read()

                    # Split into statements using sqlparse to correctly handle semicolons in strings/comments/dollar-quoted blocks
                    statements = [stmt.strip() for stmt in sqlparse.split(sql_content) if stmt and stmt.strip()]

                    for stmt in statements:
                        if stmt:
                            # Execute statements and fail-fast on first error to avoid partial schema application
                            cursor.execute(stmt)
                            print(f"Executed: {stmt[:50]}...")

        print("Database schema initialized successfully")

    except Exception as e:
        # Roll back the transaction if one was started and re-raise so callers can handle it
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
        raise
    finally:
        if conn is not None:
            conn.close()