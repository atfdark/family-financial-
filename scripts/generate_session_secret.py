"""Generate a secure session secret for local development.

Usage:
    python scripts/generate_session_secret.py

Do NOT commit the generated secret to version control. Copy it into your local .env or your secrets manager.
"""
from secrets import token_urlsafe

if __name__ == "__main__":
    # 48 bytes (url-safe) gives good entropy (~384 bits)
    print(token_urlsafe(48))
