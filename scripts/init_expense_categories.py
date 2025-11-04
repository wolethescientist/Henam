#!/usr/bin/env python3
"""
Initialize default expense categories for the Henam Task Management System.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models import ExpenseCategory, User

def create_default_categories():
    """Create default expense categories."""
    db = SessionLocal()
    
    try:
        # Get the first admin user to assign as creator
        admin_user = db.query(User).filter(User.email.like('%admin%')).first()
        if not admin_user:
            # Get any user as fallback
            admin_user = db.query(User).first()
        
        if not admin_user:
            print("❌ No users found. Please create a user first.")
            return
        
        # Default categories
        default_categories = [
            {
                "name": "Office Supplies",
                "description": "Stationery, paper, pens, and other office materials"
            },
            {
                "name": "Equipment",
                "description": "Tools, machinery, and equipment purchases"
            },
            {
                "name": "Transportation",
                "description": "Fuel, vehicle maintenance, and travel expenses"
            },
            {
                "name": "Utilities",
                "description": "Electricity, water, internet, and phone bills"
            },
            {
                "name": "Maintenance",
                "description": "Building and equipment maintenance costs"
            },
            {
                "name": "Marketing",
                "description": "Advertising, promotional materials, and marketing campaigns"
            },
            {
                "name": "Professional Services",
                "description": "Legal, accounting, consulting, and other professional fees"
            },
            {
                "name": "Insurance",
                "description": "Business insurance premiums and coverage"
            },
            {
                "name": "Training",
                "description": "Employee training and development expenses"
            },
            {
                "name": "Miscellaneous",
                "description": "Other business expenses not covered by specific categories"
            }
        ]
        
        created_count = 0
        
        for category_data in default_categories:
            # Check if category already exists
            existing = db.query(ExpenseCategory).filter(
                ExpenseCategory.name.ilike(category_data["name"])
            ).first()
            
            if not existing:
                category = ExpenseCategory(
                    name=category_data["name"],
                    description=category_data["description"],
                    created_by_id=admin_user.id
                )
                db.add(category)
                created_count += 1
                print(f"✅ Created category: {category_data['name']}")
            else:
                print(f"⏭️  Category already exists: {category_data['name']}")
        
        db.commit()
        print(f"\n🎉 Successfully created {created_count} expense categories!")
        
        # Display all categories
        all_categories = db.query(ExpenseCategory).order_by(ExpenseCategory.name).all()
        print(f"\n📋 Total expense categories: {len(all_categories)}")
        for cat in all_categories:
            status = "✅ Active" if cat.is_active else "❌ Inactive"
            print(f"  • {cat.name} - {status}")
    
    except Exception as e:
        print(f"❌ Error creating categories: {str(e)}")
        db.rollback()
    
    finally:
        db.close()


if __name__ == "__main__":
    print("🚀 Initializing default expense categories...")
    create_default_categories()