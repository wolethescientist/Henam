from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database - Supabase PostgreSQL connection
    database_url: str
    
    # Database Connection Pool Settings
    db_pool_size: int = 10  # Number of connections to maintain in the pool
    db_max_overflow: int = 20  # Additional connections that can be created on demand
    db_pool_timeout: int = 30  # Seconds to wait for a connection from the pool
    db_pool_recycle: int = 3600  # Seconds after which a connection is recycled (1 hour)
    db_pool_pre_ping: bool = True  # Validate connections before use
    
    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Web Push (optional - for notifications)
    vapid_private_key: Optional[str] = None
    vapid_public_key: Optional[str] = None
    vapid_claims_email: Optional[str] = None
    
    # App Settings
    debug: bool = True
    sql_echo: bool = False  # Set to True to see SQL queries in logs
    
    # Redis Settings (optional)
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_max_connections: int = 20  # Connection pool size for concurrent requests
    redis_socket_timeout: int = 5  # Socket timeout in seconds
    redis_socket_connect_timeout: int = 5  # Connection timeout in seconds
    
    # WebSocket Configuration
    max_ws_connections_per_user: int = 3
    environment: str = "development"
    
    # Email Settings
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    email_from: Optional[str] = None
    app_name: str = "Henam Task Management"
    frontend_url: str = "http://localhost:5173"
    
    # File Upload Settings - Production Ready
    upload_base_dir: Optional[str] = None  # Will be set based on environment
    max_file_size_mb: int = 5  # Maximum file size in MB
    
    class Config:
        env_file = ".env"
    
    def get_upload_base_dir(self) -> str:
        """Get the upload base directory with proper fallbacks for different environments."""
        if self.upload_base_dir:
            return self.upload_base_dir
        
        import os
        import platform
        
        # Check environment variable first
        env_upload_dir = os.environ.get("UPLOAD_BASE_DIR")
        if env_upload_dir:
            return env_upload_dir
        
        # Development vs Production fallbacks
        if self.debug:
            # Development: Use local uploads directory in project
            return "uploads"
        else:
            # Production: Use system directories
            if platform.system() == "Windows":
                # Windows: Use C:\uploads
                return "C:\\uploads"
            else:
                # Linux/Mac: Use /var/uploads
                return "/var/uploads"


settings = Settings()
