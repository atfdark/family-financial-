import os
from dotenv import load_dotenv
import requests
import json

load_dotenv()

def main():
    url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not service_key:
        print("Error: Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
        return

    # Read the SQL schema file
    try:
        with open('supabase_schema.sql', 'r') as f:
            sql_content = f.read()
    except FileNotFoundError:
        print("Error: supabase_schema.sql file not found.")
        return

    # Split SQL into individual statements
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
    
    # Make request to Supabase SQL API - execute each statement individually
    headers = {
        'Content-Type': 'application/json',
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    }
    
    success_count = 0
    for i, stmt in enumerate(statements):
        if stmt.strip():
            data = {
                'query': stmt + ';',
                'params': {}
            }
            
            try:
                response = requests.post(f"{url}/rest/v1/sql", headers=headers, json=data)
                
                if response.status_code in [200, 201]:
                    success_count += 1
                    print(f"SUCCESS: Statement {i+1}/{len(statements)} executed successfully")
                else:
                    print(f"FAILED: Statement {i+1}/{len(statements)} failed: {response.status_code}")
                    print(f"Response: {response.text}")
                    
            except Exception as e:
                print(f"ERROR: Statement {i+1}/{len(statements)} failed with exception: {str(e)}")
    
    if success_count == len(statements):
        print(f"\nSchema setup successful! {success_count}/{len(statements)} statements executed.")
        print("All tables created:")
        print("- users")
        print("- categories") 
        print("- payment_methods")
        print("- expenses")
        
        # Verify table creation
        verify_tables(url, service_key)
    else:
        print(f"\nSchema setup incomplete. {success_count}/{len(statements)} statements succeeded.")

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
                print("✓ All required tables verified successfully!")
            else:
                missing = expected_tables - set(existing_tables)
                print(f"⚠ Missing tables: {missing}")
        else:
            print(f"Table verification failed: {response.status_code}")
            
    except Exception as e:
        print(f"Table verification error: {str(e)}")

if __name__ == "__main__":
    main()