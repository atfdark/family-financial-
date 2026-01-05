import os
from dotenv import load_dotenv

load_dotenv()

def main():
    url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not service_key:
        print("ERROR: Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
        return

    print(f"Supabase URL: {url}")
    print(f"Service key length: {len(service_key)} characters")
    
    # Try to make a simple HTTP request to test connectivity
    import requests
    
    headers = {
        'Content-Type': 'application/json',
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    }
    
    try:
        # Try to access the Supabase API root
        response = requests.get(f"{url}/rest/v1/", headers=headers)
        print(f"API root response status: {response.status_code}")
        print(f"API root response: {response.text[:200]}...")
        
        # Try to access the SQL endpoint
        sql_data = {
            'query': 'SELECT version();',
            'params': {}
        }
        sql_response = requests.post(f"{url}/rest/v1/sql", headers=headers, json=sql_data)
        print(f"SQL endpoint response status: {sql_response.status_code}")
        print(f"SQL endpoint response: {sql_response.text[:200]}...")
        
    except Exception as e:
        print(f"ERROR: Connection test failed: {str(e)}")

if __name__ == "__main__":
    main()