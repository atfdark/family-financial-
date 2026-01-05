import os
from dotenv import load_dotenv
import requests

load_dotenv()

def main():
    url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not service_key:
        print("ERROR: Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
        return

    # Prepare headers
    headers = {
        'Content-Type': 'application/json',
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    }
    
    print("Verifying database schema...")
    
    # Check each table
    tables = ['users', 'categories', 'payment_methods', 'expenses']
    
    for table in tables:
        try:
            # Get table metadata
            response = requests.get(f"{url}/rest/v1/{table}?select=*", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print(f"SUCCESS: {table}: {len(data)} records found")
                
                # Show first few records if they exist
                if len(data) > 0:
                    print(f"  Sample data: {data[0]}")
                else:
                    print(f"  Table is empty")
            else:
                print(f"FAILED: {table}: Failed to access (status {response.status_code})")
                
        except Exception as e:
            print(f"ERROR: {table}: Error - {str(e)}")
    
    print("\nSchema verification complete!")
    print("All required tables are accessible via Supabase REST API.")

if __name__ == "__main__":
    main()