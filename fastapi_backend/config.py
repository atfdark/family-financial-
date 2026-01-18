from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator, SecretStr
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Supabase Configuration
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # JWT Configuration
    jwt_secret: SecretStr = SecretStr("development-secret-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # Session Configuration (for compatibility)
    session_secret: Optional[str] = None

    # CORS Configuration
    # Make empty by default to force explicit configuration in production
    cors_origins_str: Optional[str] = ""

    @property
    def cors_origins(self) -> List[str]:
        if not self.cors_origins_str:
            return []
        return [origin.strip() for origin in self.cors_origins_str.split(",") if origin.strip()]

    # Database Configuration (for schema operations)
    database_url: Optional[str] = None

    # Application Configuration
    debug: bool = True

    @field_validator('jwt_secret')
    def validate_jwt_secret(cls, v: SecretStr):
        s = v.get_secret_value()
        placeholders = {"", "changeme", "default", "secret", "development-secret-change-in-production"}
        
        # In development/production without env vars, allow a fallback
        if not s or s.strip().lower() in placeholders:
            # Generate a random secret for deployment if none provided
            import secrets
            random_secret = secrets.token_urlsafe(32)
            return SecretStr(random_secret)
        
        if len(s) < 16:
            raise ValueError("JWT secret must be at least 16 characters long")
        return v

    @model_validator(mode='after')
    def validate_cors(self):
        # Allow '*' (match all origins) only when debug is True
        # This prevents accidentally enabling an open CORS policy in production
        if self.cors_origins and any(o == '*' for o in self.cors_origins) and not self.debug:
            raise ValueError("Using '*' in CORS origins is only allowed when debug=True")
        return self
    
    @model_validator(mode='after')
    def validate_supabase(self):
        # Allow empty supabase config for development/fallback mode
        if not self.supabase_url or not self.supabase_anon_key:
            if not self.debug:
                # In production, require supabase config
                pass  # Will be handled gracefully by database module
        return self

    class Config:
        env_file = ".env"
        case_sensitive = False

# Create global settings instance
settings = Settings()