from typing import Dict, Any, Optional
from config import settings
from fastapi import FastAPI, Request
import logging
try:
    from supabase import create_client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    create_client = None

logger = logging.getLogger(__name__)

# Mock database for testing registration functionality
class MockSupabaseClient:
    def __init__(self):
        self.users = []
        self.next_id = 1
    
    def table(self, table_name: str):
        return MockTable(self, table_name)
    
    def insert(self, data: Dict[str, Any]):
        return MockInsert(self, data)

class MockTable:
    def __init__(self, client: MockSupabaseClient, table_name: str):
        self.client = client
        self.table_name = table_name
    
    def select(self, *args):
        return MockSelect(self.client, self.table_name, args)
    
    def eq(self, field: str, value: Any):
        return MockSelect(self.client, self.table_name, [], {field: value})
    
    def insert(self, data: Dict[str, Any]):
        return MockInsert(self.client, data)

class MockSelect:
    def __init__(self, client: MockSupabaseClient, table_name: str, fields: tuple, filters: Dict[str, Any] = None):
        self.client = client
        self.table_name = table_name
        self.fields = fields
        self.filters = filters or {}
        logger.debug(f"MockSelect created for table {table_name} with filters {self.filters}")

    def order(self, *args, **kwargs):
        logger.debug(f"MockSelect.order called with args {args} kwargs {kwargs}")
        return self

    def execute(self):
        if self.table_name == 'users':
            # Simulate finding a user by email
            if 'email' in self.filters:
                email = self.filters['email']
                for user in self.client.users:
                    if user['email'] == email:
                        return MockResponse([user])
            return MockResponse([])
        elif self.table_name == 'categories':
            # Mock some categories
            return MockResponse([
                {'id': 1, 'name': 'Food'},
                {'id': 2, 'name': 'Transport'},
                {'id': 3, 'name': 'Entertainment'}
            ])
        elif self.table_name == 'payment_methods':
            # Mock some payment methods
            return MockResponse([
                {'id': 1, 'name': 'Cash'},
                {'id': 2, 'name': 'Credit Card'},
                {'id': 3, 'name': 'Bank Transfer'}
            ])
        return MockResponse([])

class MockInsert:
    def __init__(self, client: MockSupabaseClient, data: Dict[str, Any]):
        self.client = client
        self.data = data
    
    def select(self):
        return self
    
    def execute(self):
        # Simulate inserting a user
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

# Global mock client
_mock_client: Optional[MockSupabaseClient] = None

# Keys on app.state for real clients
SUPABASE_USER_CLIENT_KEY = "supabase_user_client"
SUPABASE_ADMIN_CLIENT_KEY = "supabase_admin_client"


def init_supabase_clients(user_client=None, admin_client=None):
    """Initialize supabase clients and return them.

    Returns a tuple `(user_client, admin_client)` that should be assigned on `app.state`
    by the caller in the main thread. This avoids mutating application state from
    a worker thread or background task and keeps initialization testable.

    If running in tests, user_client/admin_client can be provided (e.g., MockSupabaseClient).
    """
    if user_client is None and admin_client is None:
        if SUPABASE_AVAILABLE:
            # In a real environment, initialize actual Supabase clients here (deferred to runtime)
            logger.debug("No external supabase clients provided; creating real clients")
            user_client = create_client(settings.supabase_url, settings.supabase_anon_key)
            admin_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
            return user_client, admin_client
        else:
            logger.warning("Supabase not available, using mock clients")
            return None, None

    return user_client, admin_client


def get_supabase_admin_client(request: Optional[Request] = None):
    """Return the admin client from request.app.state if available, else return mock client."""
    if request is not None:
        client = getattr(request.app.state, SUPABASE_ADMIN_CLIENT_KEY, None)
        if client is not None:
            return client
    # Fallback to global/mock
    global _mock_client
    if _mock_client is None:
        _mock_client = MockSupabaseClient()
    return _mock_client


def get_supabase_client(request: Optional[Request] = None):
    """Return the user client from request.app.state if available, else return admin or mock client."""
    logger.debug(f"get_supabase_client called with request: {request is not None}")
    if request is not None:
        client = getattr(request.app.state, SUPABASE_USER_CLIENT_KEY, None)
        logger.debug(f"User client from state: {client is not None}")
        if client is not None:
            return client
        client = getattr(request.app.state, SUPABASE_ADMIN_CLIENT_KEY, None)
        logger.debug(f"Admin client from state: {client is not None}")
        if client is not None:
            return client
    return get_supabase_admin_client()