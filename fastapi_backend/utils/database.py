import psycopg2
import os
from config import settings

def initialize_database():
    """Initialize database schema if tables don't exist"""
    if not settings.database_url:
        print("DATABASE_URL not configured, skipping schema initialization")
        return

    try:
        # Connect to database
        conn = psycopg2.connect(settings.database_url)
        cursor = conn.cursor()

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
            cursor.close()
            conn.close()
            return

        print("Creating database schema...")

        # Read and execute schema files
        schema_files = ['supabase_schema.sql', 'supabase_functions.sql']

        for schema_file in schema_files:
            if os.path.exists(f"../{schema_file}"):
                with open(f"../{schema_file}", 'r') as f:
                    sql_content = f.read()

                # Split into statements
                statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]

                for stmt in statements:
                    if stmt:
                        try:
                            cursor.execute(stmt)
                            print(f"Executed: {stmt[:50]}...")
                        except Exception as e:
                            print(f"Error executing statement: {str(e)}")
                            conn.rollback()
                            continue

        conn.commit()
        print("Database schema initialized successfully")

    except Exception as e:
        print(f"Database initialization error: {str(e)}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()