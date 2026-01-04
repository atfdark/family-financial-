import os
from dotenv import load_dotenv

load_dotenv()

try:
    from supabase import create_client, Client
except ImportError:
    print("supabase-py library not installed. Please install with: pip install supabase")
    exit(1)

def main():
    url = os.environ.get('SUPABASE_URL')
    anon_key = os.environ.get('SUPABASE_ANON_KEY')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not anon_key or not service_key:
        print("Error: Missing required environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).")
        return

    try:
        # Using service role key for admin access
        supabase: Client = create_client(url, service_key)
        
        # Query the categories table to verify connection and schema
        response = supabase.table('categories').select('*').limit(1).execute()
        
        if response.data is not None:
            print("Connection to Supabase successful. Schema verified: 'categories' table accessible.")
        else:
            print("Connection successful, but query returned no data. Schema may be empty.")
    except Exception as e:
        print(f"Connection failed or schema verification error: {str(e)}")

if __name__ == "__main__":
    main()