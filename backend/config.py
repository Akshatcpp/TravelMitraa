import os
from dataclasses import dataclass

@dataclass
class Config:
    MAPPLS_CLIENT_ID: str = os.getenv("MAPPLS_CLIENT_ID", "")
    MAPPLS_CLIENT_SECRET: str = os.getenv("MAPPLS_CLIENT_SECRET", "")
    MAPPLS_API_KEY: str = os.getenv("MAPPLS_API_KEY", "")
    DEFAULT_RADIUS_METERS: int = int(os.getenv("DEFAULT_RADIUS_METERS", "1500"))

cfg = Config()

# Simple in-process token cache
class TokenCache:
    access_token: str | None = None
    expires_at_ms: int = 0

token_cache = TokenCache()
