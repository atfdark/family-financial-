import os
from dotenv import load_dotenv
import requests
import json

load_dotenv()

def main():
    # Load environment variables
    url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not service_key:
        print("ERROR: Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
        return

    # Read the SQL schema file
    try:
        with open('supabase_schema.sql', 'r') as f:
            sql_content = f.read()
    except FileNotFoundError:
        print("ERROR: supabase_schema.sql file not found.")
        return

    # Prepare headers
    headers = {
        'Content-Type': 'application/json',
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    }
    
    # Prepare the SQL request
    data = {
        'query': sql_content,
        'params': {}
    }
    
    try:
        # Try the SQL endpoint
        response = requests.post(f"{url}/rest/v1/sql", headers=headers, json=data)
        
        if response.status_code in [200, 201]:
            print("SUCCESS: Schema setup completed!")
            print("All tables created:")
            print("- users")
            print("- categories") 
            print("- payment_methods")
            print("- expenses")
            
            # Verify table creation
            verify_tables(url, service_key)
        else:
            print(f"ERROR: Schema setup failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"ERROR: Connection failed: {str(e)}")

def verify_tables(url, service_key):
    """Verify that all required tables exist"""
    headers = {
        'Content-Type': 'application/json',
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    }
    
    # Query to check table existence
    check_query = """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'categories', 'payment_methods', 'expenses')
    """
    
    data = {
        'query': check_query,
        'params': {}
    }
    
    try:
        response = requests.post(f"{url}/rest/v1/sql", headers=headers, json=data)
        
        if response.status_code == 200:
            result = response.json()
            existing_tables = [row['table_name'] for row in result]
            expected_tables = {'users', 'categories', 'payment_methods', 'expenses'}
            
            if expected_tables.issubset(set(existing_tables)):
                print("SUCCESS: All required tables verified!")
            else:
                missing = expected_tables - set(existing_tables)
                print(f"WARNING: Missing tables: {missing}")
        else:
            print(f"ERROR: Table verification failed with status {response.status_code}")
            
    except Exception as e:
        print(f"ERROR: Table verification failed: {str(e)}")

if __name__ == "__main__":
    main()