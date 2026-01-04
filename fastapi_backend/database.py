from supabase import create_client, Client
from config import settings

# Global Supabase clients
_supabase_user_client: Client = None
_supabase_admin_client: Client = None

def get_supabase_client() -> Client:
    """Get the user Supabase client (with anon key)"""
    global _supabase_user_client
    if _supabase_user_client is None:
        _supabase_user_client = create_client(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_anon_key
        )
    return _supabase_user_client

def get_supabase_admin_client() -> Client:
    """Get the admin Supabase client (with service role key)"""
    global _supabase_admin_client
    if _supabase_admin_client is None:
        _supabase_admin_client = create_client(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_service_role_key
        )
    return _supabase_admin_client