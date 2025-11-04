#!/usr/bin/env python3
"""
Setup script for the Henam Task Management Backend.
This script helps set up the development environment.
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"Running: {description}")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✓ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {description} failed:")
        print(f"  Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 8):
        print("✗ Python 3.8 or higher is required")
        return False
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def check_env_file():
    """Check if .env file exists."""
    env_file = Path(".env")
    if not env_file.exists():
        print("✗ .env file not found")
        print("  Please create a .env file based on .env.template")
        return False
    print("✓ .env file found")
    return True

def install_dependencies():
    """Install Python dependencies."""
    return run_command("pip install -r requirements.txt", "Installing dependencies")

def run_migrations():
    """Run database migrations."""
    return run_command("alembic upgrade head", "Running database migrations")

def create_admin_user():
    """Create admin user."""
    return run_command("python scripts/init_admin.py", "Creating admin user")

def main():
    """Main setup function."""
    print("🚀 Setting up Henam Task Management Backend...")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Check .env file
    if not check_env_file():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        print("Please fix dependency installation issues and try again")
        sys.exit(1)
    
    # Run migrations
    if not run_migrations():
        print("Please fix database migration issues and try again")
        sys.exit(1)
    
    # Create admin user
    if not create_admin_user():
        print("Please fix admin user creation issues and try again")
        sys.exit(1)
    
    print("=" * 50)
    print("🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Update the .env file with your actual database credentials")
    print("2. Run the application: python run.py")
    print("3. Access the API documentation at: http://localhost:8000/docs")
    print("4. Login with admin@henam.com / admin123")

if __name__ == "__main__":
    main()
