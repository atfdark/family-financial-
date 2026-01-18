from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator, SecretStr
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Supabase Configuration
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

# JWT Configuration
    jwt_secret: SecretStr
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
    debug: bool = False

    @field_validator('jwt_secret')
    def validate_jwt_secret(cls, v: SecretStr):
        s = v.get_secret_value()
        placeholders = {"", "changeme", "default", "secret"}
        if not s or s.strip().lower() in placeholders or len(s) < 16:
            raise ValueError("JWT secret must be set to a secure non-default value with sufficient length")
        return v

    @model_validator(mode='after')
    def validate_cors(self):
        # Allow '*' (match all origins) only when debug is True
        # This prevents accidentally enabling an open CORS policy in production
        if self.cors_origins and any(o == '*' for o in self.cors_origins) and not self.debug:
            raise ValueError("Using '*' in CORS origins is only allowed when debug=True")
        return self

    class Config:
        env_file = ".env"
        case_sensitive = False

# Create global settings instance
settings = Settings()