#!/usr/bin/env python3
"""
Database migration script to add CANCELLED status to JobStatus enum
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import get_db, engine
from app.models import JobStatus
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_cancelled_status_to_enum():
    """Add CANCELLED status to the JobStatus enum in the database"""
    
    try:
        with engine.connect() as connection:
            # Check if CANCELLED already exists in the enum
            result = connection.execute(text("""
                SELECT unnest(enum_range(NULL::jobstatus)) as status_value;
            """))
            
            existing_statuses = [row[0] for row in result.fetchall()]
            logger.info(f"Existing job statuses: {existing_statuses}")
            
            if 'CANCELLED' not in existing_statuses:
                logger.info("Adding CANCELLED status to JobStatus enum...")
                
                # Add CANCELLED to the enum
                connection.execute(text("""
                    ALTER TYPE jobstatus ADD VALUE 'CANCELLED';
                """))
                
                connection.commit()
                logger.info("✅ Successfully added CANCELLED status to JobStatus enum")
            else:
                logger.info("✅ CANCELLED status already exists in JobStatus enum")
                
    except Exception as e:
        logger.error(f"❌ Error adding CANCELLED status: {e}")
        raise

def verify_enum_update():
    """Verify that the enum update was successful"""
    
    try:
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT unnest(enum_range(NULL::jobstatus)) as status_value;
            """))
            
            statuses = [row[0] for row in result.fetchall()]
            logger.info(f"Updated job statuses: {statuses}")
            
            expected_statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
            
            for status in expected_statuses:
                if status in statuses:
                    logger.info(f"✅ {status} - Present")
                else:
                    logger.error(f"❌ {status} - Missing")
                    return False
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error verifying enum update: {e}")
        return False

def main():
    """Main migration function"""
    logger.info("🚀 Starting JobStatus enum migration...")
    logger.info("=" * 50)
    
    try:
        # Add CANCELLED status to enum
        add_cancelled_status_to_enum()
        
        # Verify the update
        if verify_enum_update():
            logger.info("\n🎉 JobStatus enum migration completed successfully!")
            logger.info("The following statuses are now available:")
            logger.info("  - NOT_STARTED")
            logger.info("  - IN_PROGRESS") 
            logger.info("  - COMPLETED")
            logger.info("  - CANCELLED")
        else:
            logger.error("\n❌ JobStatus enum migration verification failed!")
            return False
            
        return True
        
    except Exception as e:
        logger.error(f"\n❌ JobStatus enum migration failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)