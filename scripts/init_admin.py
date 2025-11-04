#!/usr/bin/env python3
"""
Script to initialize the admin user in the database.
Run this script after setting up the database to create the first admin user.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, User, UserRole
from app.auth import get_password_hash
from app.config import settings

def create_admin_user():
    """Create the initial admin user."""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if existing_admin:
            print("Admin user already exists!")
            return
        
        # Create admin user
        admin_user = User(
            name="System Administrator",
            email="admin@henam.com",
            password_hash=get_password_hash("admin123"),  # Change this password!
            role=UserRole.ADMIN,
            team_id=None,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"Admin user created successfully!")
        print(f"Email: admin@henam.com")
        print(f"Password: admin123")
        print(f"User ID: {admin_user.id}")
        print("\nIMPORTANT: Please change the admin password after first login!")
        
    except Exception as e:
        print(f"Error creating admin user: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
