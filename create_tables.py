import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

def main():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not found.")
        return

    try:
        # Connect to the database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        print("Connected to Supabase database successfully.")

        # Read the SQL schema file
        with open('supabase_schema.sql', 'r') as f:
            sql_content = f.read()

        # Split SQL into individual statements (assuming statements end with ';')
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]

        # Execute each statement in order
        for stmt in statements:
            try:
                cursor.execute(stmt)
                print(f"Executed statement: {stmt[:50]}...")
            except Exception as e:
                print(f"Error executing statement: {str(e)}")
                conn.rollback()
                continue

        # Commit all changes
        conn.commit()
        print("All schema statements executed successfully.")

        # Verify table creation
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('users', 'categories', 'payment_methods', 'expenses')
        """)
        existing_tables = [row[0] for row in cursor.fetchall()]
        expected_tables = {'users', 'categories', 'payment_methods', 'expenses'}

        if expected_tables.issubset(set(existing_tables)):
            print("Verification successful: All required tables exist.")
        else:
            missing = expected_tables - set(existing_tables)
            print(f"Verification failed: Missing tables: {missing}")

    except Exception as e:
        print(f"An error occurred: {str(e)}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("Database connection closed.")

if __name__ == "__main__":
    main()