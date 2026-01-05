import os
from dotenv import load_dotenv

load_dotenv()

def main():
    url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not service_key:
        print("ERROR: Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
        return

    try:
        # Try to import and use the Supabase client
        from supabase import create_client
        
        print("Attempting to create Supabase client...")
        supabase = create_client(url, service_key)
        print("SUCCESS: Supabase client created")
        
        # Read the SQL schema file
        try:
            with open('supabase_schema.sql', 'r') as f:
                sql_content = f.read()
        except FileNotFoundError:
            print("ERROR: supabase_schema.sql file not found.")
            return

        # Split SQL into individual statements
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        print(f"Found {len(statements)} SQL statements to execute")
        
        # Execute each statement using the Supabase client
        success_count = 0
        for i, stmt in enumerate(statements):
            if stmt.strip():
                try:
                    # Use the Supabase client to execute raw SQL
                    response = supabase.rpc('sql', {'query': stmt + ';'}).execute()
                    
                    if response.data is not None:
                        success_count += 1
                        print(f"SUCCESS: Statement {i+1}/{len(statements)} executed")
                    else:
                        print(f"FAILED: Statement {i+1}/{len(statements)} returned no data")
                        
                except Exception as e:
                    print(f"ERROR: Statement {i+1}/{len(statements)} failed: {str(e)}")
        
        if success_count == len(statements):
            print(f"\nSUCCESS: Schema setup completed! {success_count}/{len(statements)} statements executed.")
            print("All tables created:")
            print("- users")
            print("- categories") 
            print("- payment_methods")
            print("- expenses")
        else:
            print(f"\nWARNING: Schema setup incomplete. {success_count}/{len(statements)} statements succeeded.")
            
    except ImportError:
        print("ERROR: Supabase client library not installed. Please install it with: pip install supabase")
    except Exception as e:
        print(f"ERROR: Failed to create Supabase client: {str(e)}")

if __name__ == "__main__":
    main()