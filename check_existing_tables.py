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
    
    # Try to access existing tables via REST API
    try:
        # Try to access the users table
        response = requests.get(f"{url}/rest/v1/users", headers=headers)
        print(f"Users table access status: {response.status_code}")
        if response.status_code == 200:
            print("Users table exists and is accessible")
        elif response.status_code == 404:
            print("Users table does not exist")
        else:
            print(f"Users table access failed: {response.text}")
            
        # Try to access the categories table
        response = requests.get(f"{url}/rest/v1/categories", headers=headers)
        print(f"Categories table access status: {response.status_code}")
        if response.status_code == 200:
            print("Categories table exists and is accessible")
        elif response.status_code == 404:
            print("Categories table does not exist")
        else:
            print(f"Categories table access failed: {response.text}")
            
        # Try to access the payment_methods table
        response = requests.get(f"{url}/rest/v1/payment_methods", headers=headers)
        print(f"Payment methods table access status: {response.status_code}")
        if response.status_code == 200:
            print("Payment methods table exists and is accessible")
        elif response.status_code == 404:
            print("Payment methods table does not exist")
        else:
            print(f"Payment methods table access failed: {response.text}")
            
        # Try to access the expenses table
        response = requests.get(f"{url}/rest/v1/expenses", headers=headers)
        print(f"Expenses table access status: {response.status_code}")
        if response.status_code == 200:
            print("Expenses table exists and is accessible")
        elif response.status_code == 404:
            print("Expenses table does not exist")
        else:
            print(f"Expenses table access failed: {response.text}")
            
    except Exception as e:
        print(f"ERROR: Failed to check existing tables: {str(e)}")

if __name__ == "__main__":
    main()