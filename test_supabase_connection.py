import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def main():
    url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not service_key:
        print("Error: Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
        return

    try:
        # Create Supabase client
        supabase = create_client(url, service_key)
        print("✓ Supabase client created successfully")
        
        # Try to query the database to verify connection
        response = supabase.table('categories').select('*').limit(1).execute()
        
        if response.data is not None:
            print("✓ Connection to Supabase successful")
            print(f"✓ Found {len(response.data)} records in categories table")
        else:
            print("✓ Connection successful, but no data found")
            
    except Exception as e:
        print(f"ERROR: Connection failed: {str(e)}")
        print(f"Error type: {type(e).__name__}")

if __name__ == "__main__":
    main()