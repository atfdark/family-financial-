#!/usr/bin/env python3

# Simple mock database test without config dependencies

class MockSupabaseClient:
    def __init__(self):
        self.users = []
        self.next_id = 1
    
    def table(self, table_name: str):
        return MockTable(self, table_name)
    
    def insert(self, data: dict):
        return MockInsert(self, data)

class MockTable:
    def __init__(self, client, table_name: str):
        self.client = client
        self.table_name = table_name
    
    def select(self, *args):
        return MockSelect(self.client, self.table_name, args)
    
    def eq(self, field: str, value):
        return MockSelect(self.client, self.table_name, [], {field: value})
    
    def insert(self, data: dict):
        return MockInsert(self.client, data)

class MockSelect:
    def __init__(self, client, table_name: str, fields: tuple, filters: dict = None):
        self.client = client
        self.table_name = table_name
        self.fields = fields
        self.filters = filters or {}
    
    def execute(self):
        if self.table_name == 'users':
            if 'email' in self.filters:
                email = self.filters['email']
                for user in self.client.users:
                    if user['email'] == email:
                        return MockResponse([user])
            return MockResponse([])
        return MockResponse([])

class MockInsert:
    def __init__(self, client, data: dict):
        self.client = client
        self.data = data
    
    def select(self):
        return self
    
    def execute(self):
        user = {
            'id': self.client.next_id,
            'name': self.data.get('name', ''),
            'email': self.data.get('email', ''),
            'password_hash': self.data.get('password_hash', '')
        }
        self.client.users.append(user)
        self.client.next_id += 1
        return MockResponse([user])

class MockResponse:
    def __init__(self, data: list):
        self.data = data

def test_mock_database():
    print("Testing mock database...")
    
    # Create mock client
    client = MockSupabaseClient()
    print(f"Client type: {type(client)}")
    
    # Test inserting a user
    user_data = {
        "name": "testuser",
        "email": "testuser@example.com",
        "password_hash": "hashed_password"
    }
    
    response = client.table('users').insert(user_data).select().execute()
    print(f"Insert response: {response.data}")
    
    # Test selecting a user
    response = client.table('users').select('id, name, email, password_hash').eq('email', 'testuser@example.com').execute()
    print(f"Select response: {response.data}")
    
    print("Mock database test completed successfully!")

if __name__ == "__main__":
    test_mock_database()