#!/usr/bin/env python3
"""
Clean up duplicate indexes identified by Supabase linter.
This will significantly improve write performance and reduce storage.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Duplicate indexes to drop (keeping the first one in each group)
DUPLICATE_INDEXES_TO_DROP = [
    # Attendance table
    "ix_attendance_date",
    "ix_attendance_staff_id", 
    "ix_attendance_staff_date",
    "ix_attendance_staff_date_prod",
    "ix_attendance_staff_id_date_async",
    "ix_attendance_status",
    
    # Invoices table
    "ix_invoices_client_name_status_async",
    "ix_invoices_client_status_prod",
    "ix_invoices_created_at",
    "ix_invoices_due_date",
    "ix_invoices_job_id",
    "ix_invoices_job_id_status_async",
    "ix_invoices_job_status",  # Keep idx_invoices_job_status
    "ix_invoices_status",
    "ix_invoices_status_due_prod",
    "ix_invoices_status_pending",
    "ix_invoices_invoice_number",
    
    # Jobs table
    "ix_jobs_assigner_id",
    "ix_jobs_assigner_status",
    "ix_jobs_created_at_desc_async",
    "ix_jobs_created_at",
    "ix_jobs_status",
    "ix_jobs_supervisor_id",
    "ix_jobs_supervisor_status",
    "ix_jobs_team_id",
    "ix_jobs_team_id_status_async",
    "ix_jobs_team_status_prod",
    "ix_jobs_team_updated",
    "ix_jobs_updated_at_desc",
    "ix_jobs_client_trgm",
    "ix_jobs_title_trgm",
    
    # Notifications table
    "ix_notifications_created_at_desc_async",
    "ix_notifications_user_created_at",
    "ix_notifications_user_id_status_async",
    "ix_notifications_user_status_prod",
    "ix_notifications_user_status_created",
    
    # Reminders table
    "ix_reminders_scheduled_status_prod",
    "ix_reminders_user_scheduled",
    
    # Tasks table
    "ix_tasks_assigned_to_id",
    "ix_tasks_assigned_status",
    "ix_tasks_assigned_status_prod",
    "ix_tasks_assigned_to_id_status_async",
    "ix_tasks_assigner_id",
    "ix_tasks_deadline",
    "ix_tasks_deadline_status_async",
    "ix_tasks_deadline_status_prod",
    "ix_tasks_job_id",
    "ix_tasks_status",
    "ix_tasks_title_trgm",
    
    # Users table
    "ix_users_supervisor_id",
    "ix_users_team_id",
    "ix_users_team_id_active_async",
]

def drop_duplicate_indexes():
    """Drop duplicate indexes to improve performance."""
    
    print("🧹 Cleaning Up Duplicate Indexes")
    print("=" * 60)
    print(f"Total indexes to drop: {len(DUPLICATE_INDEXES_TO_DROP)}")
    print()
    
    engine = create_engine(settings.database_url)
    
    success_count = 0
    not_found_count = 0
    error_count = 0
    
    with engine.connect() as conn:
        for i, index_name in enumerate(DUPLICATE_INDEXES_TO_DROP, 1):
            try:
                print(f"[{i}/{len(DUPLICATE_INDEXES_TO_DROP)}] Dropping {index_name}...", end=" ")
                
                # Drop index if exists
                drop_sql = f"DROP INDEX IF EXISTS {index_name}"
                conn.execute(text(drop_sql))
                conn.commit()
                
                print("✅")
                success_count += 1
                
            except Exception as e:
                error_msg = str(e).lower()
                if "does not exist" in error_msg:
                    print("⚠️  (not found)")
                    not_found_count += 1
                else:
                    print(f"❌ Error: {e}")
                    error_count += 1
                    logger.error(f"Failed to drop {index_name}: {e}")
                    conn.rollback()
    
    print("\n" + "=" * 60)
    print("📊 Cleanup Summary:")
    print(f"   Successfully dropped: {success_count}")
    print(f"   Not found: {not_found_count}")
    print(f"   Errors: {error_count}")
    print()
    
    if success_count > 0:
        print("✅ Duplicate indexes cleaned up successfully!")
        print()
        print("📈 Expected improvements:")
        print("   • Faster INSERT/UPDATE operations")
        print("   • Reduced storage usage")
        print("   • Better query planner decisions")
        print("   • Improved cache efficiency")
        return True
    else:
        print("⚠️  No indexes were dropped")
        return False

def analyze_remaining_indexes():
    """Show remaining indexes after cleanup."""
    
    print("\n🔍 Analyzing Remaining Indexes...")
    print("=" * 60)
    
    engine = create_engine(settings.database_url)
    
    query = """
    SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND (
        tablename IN ('jobs', 'invoices', 'tasks', 'users', 'attendance', 'notifications', 'reminders')
    )
    ORDER BY tablename, indexname;
    """
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query)).fetchall()
            
            if result:
                current_table = None
                for row in result:
                    if row.tablename != current_table:
                        current_table = row.tablename
                        print(f"\n📋 {current_table.upper()}")
                        print("-" * 60)
                    print(f"   {row.indexname}")
            else:
                print("No indexes found")
                
    except Exception as e:
        print(f"⚠️  Could not analyze indexes: {e}")

def vacuum_analyze():
    """Run VACUUM ANALYZE to reclaim space and update statistics."""
    
    print("\n🔧 Running VACUUM ANALYZE...")
    print("=" * 60)
    
    # Use autocommit for VACUUM
    engine = create_engine(settings.database_url, isolation_level="AUTOCOMMIT")
    
    tables = ['jobs', 'invoices', 'tasks', 'users', 'attendance', 'notifications', 'reminders', 'teams']
    
    try:
        conn = engine.connect()
        
        for table in tables:
            try:
                print(f"Analyzing {table}...", end=" ")
                conn.execute(text(f"VACUUM ANALYZE {table}"))
                print("✅")
            except Exception as e:
                print(f"❌ {e}")
        
        conn.close()
        print("\n✅ VACUUM ANALYZE completed")
        
    except Exception as e:
        print(f"❌ VACUUM ANALYZE failed: {e}")

def main():
    """Main function."""
    
    print("🚀 Database Index Cleanup Tool")
    print("=" * 60)
    print(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'Unknown'}")
    print(f"Timestamp: {__import__('datetime').datetime.now()}")
    print()
    
    # Confirm before proceeding
    print("⚠️  WARNING: This will drop duplicate indexes from your database.")
    print("This is safe and will improve performance, but make sure you have a backup.")
    print()
    
    if os.getenv('AUTO_CONFIRM') != 'true':
        response = input("Do you want to proceed? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("❌ Cleanup cancelled")
            return False
    
    # Drop duplicate indexes
    success = drop_duplicate_indexes()
    
    if success:
        # Show remaining indexes
        analyze_remaining_indexes()
        
        # Run VACUUM ANALYZE
        vacuum_analyze()
        
        print("\n📝 Next Steps:")
        print("1. Monitor query performance - should see immediate improvement")
        print("2. Check dashboard response times")
        print("3. Monitor database size - should see reduction")
        print("4. Run the app and verify everything works correctly")
        
        return True
    else:
        print("\n❌ Cleanup failed or no indexes to drop")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Cleanup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)
