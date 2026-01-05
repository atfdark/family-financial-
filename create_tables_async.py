import os
from dotenv import load_dotenv
import asyncio
from supabase import create_client

load_dotenv()

async def main():
    url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not service_key:
        print("Error: Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
        return

    try:
        # Create Supabase client
        supabase = create_client(url, service_key)
        
        # Read the SQL schema file
        with open('supabase_schema.sql', 'r') as f:
            sql_content = f.read()
        
        # Split SQL into individual statements
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        print("Executing schema setup...")
        
        # Execute each statement
        for i, stmt in enumerate(statements):
            try:
                # Use the SQL method to execute raw SQL
                result = await supabase.rpc('sql', {'query': stmt + ';'})
                print(f"✓ Statement {i+1}/{len(statements)} executed successfully")
            except Exception as e:
                print(f"✗ Error executing statement {i+1}: {str(e)}")
                continue
        
        print("\nSchema setup completed!")
        
        # Verify table creation
        await verify_tables(supabase)
        
    except Exception as e:
        print(f"Connection failed: {str(e)}")

async def verify_tables(supabase):
    """Verify that all required tables exist"""
    try:
        # Query to check table existence
        check_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'categories', 'payment_methods', 'expenses')
        """
        
        result = await supabase.rpc('sql', {'query': check_query})
        
        if result.data:
            existing_tables = [row['table_name'] for row in result.data]
            expected_tables = {'users', 'categories', 'payment_methods', 'expenses'}
            
            if expected_tables.issubset(set(existing_tables)):
                print("✓ All required tables verified successfully!")
                print("Tables created:")
                for table in existing_tables:
                    print(f"  - {table}")
            else:
                missing = expected_tables - set(existing_tables)
                print(f"⚠ Missing tables: {missing}")
        else:
            print("No tables found in verification query")
            
    except Exception as e:
        print(f"Table verification error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())