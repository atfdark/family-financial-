import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

def main():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not found.")
        return

    print(f"Database URL: {database_url}")
    
    try:
        # Connect to the database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        print("✓ Connected to Supabase database successfully.")
        
        # Test a simple query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"Database version: {version[0]}")
        
        # Check if tables exist
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('users', 'categories', 'payment_methods', 'expenses')
        """)
        existing_tables = [row[0] for row in cursor.fetchall()]
        print(f"Existing tables: {existing_tables}")
        
        if len(existing_tables) == 0:
            print("No tables found. Schema needs to be created.")
        else:
            print("Tables already exist!")
        
    except Exception as e:
        print(f"ERROR: Connection failed: {str(e)}")
        print(f"Error type: {type(e).__name__}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("Database connection closed.")

if __name__ == "__main__":
    main()