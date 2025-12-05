"""
Backfill script for job creation source fields
This script sets creation_source to AUTO_FROM_INVOICE for all existing jobs
and sets duplicate_override to False for all existing jobs.
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Job, JobCreationSource
from sqlalchemy import text


def backfill_creation_source(db: Session):
    """
    Backfill creation_source for existing jobs.
    Sets all existing jobs to AUTO_FROM_INVOICE since they were created from invoices.
    """
    print("Starting backfill of creation_source field...")
    
    try:
        # Count total jobs to update
        total_jobs = db.query(Job).count()
        print(f"Found {total_jobs} jobs to update")
        
        if total_jobs == 0:
            print("No jobs found. Nothing to backfill.")
            return
        
        # Update all jobs where creation_source is NULL or needs to be set
        # Since this is a new field, we'll set all existing jobs to AUTO_FROM_INVOICE
        updated_count = db.query(Job).update({
            Job.creation_source: JobCreationSource.AUTO_FROM_INVOICE
        }, synchronize_session=False)
        
        db.commit()
        print(f"✓ Successfully updated {updated_count} jobs with creation_source = AUTO_FROM_INVOICE")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error during creation_source backfill: {str(e)}")
        raise


def backfill_duplicate_override(db: Session):
    """
    Backfill duplicate_override for existing jobs.
    Sets all existing jobs to False (no duplicate override).
    """
    print("\nStarting backfill of duplicate_override field...")
    
    try:
        # Count total jobs to update
        total_jobs = db.query(Job).filter(Job.duplicate_override == None).count()
        print(f"Found {total_jobs} jobs with NULL duplicate_override")
        
        if total_jobs == 0:
            print("No jobs need duplicate_override update.")
            return
        
        # Update all jobs where duplicate_override is NULL
        updated_count = db.query(Job).filter(Job.duplicate_override == None).update({
            Job.duplicate_override: False
        }, synchronize_session=False)
        
        db.commit()
        print(f"✓ Successfully updated {updated_count} jobs with duplicate_override = False")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error during duplicate_override backfill: {str(e)}")
        raise


def verify_data_integrity(db: Session):
    """
    Verify data integrity after backfill.
    """
    print("\nVerifying data integrity...")
    
    try:
        # Check for any jobs with NULL creation_source
        null_creation_source = db.query(Job).filter(Job.creation_source == None).count()
        if null_creation_source > 0:
            print(f"⚠ Warning: {null_creation_source} jobs still have NULL creation_source")
        else:
            print("✓ All jobs have creation_source set")
        
        # Check for any jobs with NULL duplicate_override
        null_duplicate_override = db.query(Job).filter(Job.duplicate_override == None).count()
        if null_duplicate_override > 0:
            print(f"⚠ Warning: {null_duplicate_override} jobs still have NULL duplicate_override")
        else:
            print("✓ All jobs have duplicate_override set")
        
        # Count jobs by creation_source
        manual_count = db.query(Job).filter(Job.creation_source == JobCreationSource.MANUAL).count()
        auto_count = db.query(Job).filter(Job.creation_source == JobCreationSource.AUTO_FROM_INVOICE).count()
        
        print(f"\nJob creation source distribution:")
        print(f"  - MANUAL: {manual_count}")
        print(f"  - AUTO_FROM_INVOICE: {auto_count}")
        print(f"  - Total: {manual_count + auto_count}")
        
        # Count jobs with duplicate_override = True
        duplicate_override_count = db.query(Job).filter(Job.duplicate_override == True).count()
        print(f"\nJobs with duplicate_override = True: {duplicate_override_count}")
        
        print("\n✓ Data integrity verification complete")
        
    except Exception as e:
        print(f"✗ Error during verification: {str(e)}")
        raise


def main():
    """
    Main function to run the backfill script.
    """
    print("=" * 60)
    print("Job Creation Source Backfill Script")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # Run backfill operations
        backfill_creation_source(db)
        backfill_duplicate_override(db)
        
        # Verify data integrity
        verify_data_integrity(db)
        
        print("\n" + "=" * 60)
        print("Backfill completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Backfill failed: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
