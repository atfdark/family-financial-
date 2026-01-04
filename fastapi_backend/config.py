from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Supabase Configuration
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # JWT Configuration
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # CORS Configuration
    cors_origins_str: str = "*"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins_str.split(",")]

    # Database Configuration (for schema operations)
    database_url: Optional[str] = None

    # Application Configuration
    debug: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False

# Create global settings instance
settings = Settings()