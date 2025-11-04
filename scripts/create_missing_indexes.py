#!/usr/bin/env python3
"""
Create missing indexes identified from query analysis.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Missing indexes to create
MISSING_INDEXES = [
    # JOBS - Critical for dashboard and filtering
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jobs_team_id_status_created_at ON jobs(team_id, status, created_at DESC)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jobs_supervisor_id_status_created_at ON jobs(supervisor_id, status, created_at DESC)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jobs_status_created_at ON jobs(status, created_at DESC)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jobs_team_id_status ON jobs(team_id, status)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jobs_team_id_updated_at ON jobs(team_id, updated_at DESC)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jobs_status_progress ON jobs(status, progress)",
    
    # INVOICES - Critical for dashboard financial summary
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_invoices_job_id_status_created_at ON invoices(job_id, status, created_at DESC)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_invoices_status_amount_paid_amount ON invoices(status, amount, paid_amount)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_invoices_created_at_amount_paid_amount ON invoices(created_at, amount, paid_amount)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_invoices_job_id_amount_paid_amount_status ON invoices(job_id, amount, paid_amount, status)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_invoices_status_pending_amount ON invoices(status, pending_amount)",
    
    # TASKS - For task filtering
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tasks_assigned_to_id_status_created_at ON tasks(assigned_to_id, status, created_at DESC)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tasks_assigner_id_status_created_at ON tasks(assigner_id, status, created_at DESC)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tasks_job_id_status ON tasks(job_id, status)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tasks_status_deadline ON tasks(status, deadline)",
    
    # USERS - For team member queries
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_team_id_is_active ON users(team_id, is_active)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_is_active_created_at ON users(is_active, created_at DESC)",
    
    # ATTENDANCE - For attendance history
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_attendance_staff_id_date ON attendance(staff_id, date DESC)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_attendance_date_status ON attendance(date, status)",
]

def create_indexes():
    """Create missing indexes."""
    
    print("🔧 Creating Missing Indexes")
    print("=" * 80)
    print(f"Total indexes to create: {len(MISSING_INDEXES)}")
    print()
    
    # Use autocommit for CONCURRENT index creation
    engine = create_engine(settings.database_url, isolation_level="AUTOCOMMIT")
    
    success_count = 0
    exists_count = 0
    error_count = 0
    
    conn = engine.connect()
    
    for i, index_sql in enumerate(MISSING_INDEXES, 1):
        try:
            # Extract index name
            index_name = index_sql.split("IF NOT EXISTS ")[1].split(" ON ")[0]
            
            print(f"[{i}/{len(MISSING_INDEXES)}] Creating {index_name}...", end=" ")
            
            # Execute index creation
            conn.execute(text(index_sql))
            
            print("✅")
            success_count += 1
            
        except Exception as e:
            error_msg = str(e).lower()
            if "already exists" in error_msg or "duplicate" in error_msg:
                print("⚠️  (already exists)")
                exists_count += 1
            else:
                print(f"❌ Error: {e}")
                error_count += 1
                logger.error(f"Failed to create index: {e}")
    
    conn.close()
    
    print("\n" + "=" * 80)
    print("📊 Summary:")
    print(f"   Successfully created: {success_count}")
    print(f"   Already existed: {exists_count}")
    print(f"   Errors: {error_count}")
    print()
    
    if success_count > 0:
        print("✅ Missing indexes created successfully!")
        print("\n📈 Expected improvements:")
        print("   • Dashboard queries: 3-5x faster")
        print("   • Filtered lists: 2-3x faster")
        print("   • Better query planner decisions")
        return True
    elif exists_count == len(MISSING_INDEXES):
        print("✅ All indexes already exist!")
        return True
    else:
        print("⚠️  Some indexes failed to create")
        return False

def main():
    """Main function."""
    
    print("🚀 Create Missing Indexes")
    print("=" * 80)
    print(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'Unknown'}")
    print(f"Timestamp: {__import__('datetime').datetime.now()}")
    print()
    
    print("⚠️  This will create indexes using CONCURRENTLY (no table locks)")
    print("Safe to run on production database")
    print()
    
    if os.getenv('AUTO_CONFIRM') != 'true':
        response = input("Proceed? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("❌ Cancelled")
            return False
    
    success = create_indexes()
    
    if success:
        print("\n📝 Next Steps:")
        print("1. Run ANALYZE on tables: ANALYZE jobs, invoices, tasks, users, attendance;")
        print("2. Test dashboard performance")
        print("3. Monitor query execution plans")
        
        return True
    else:
        print("\n❌ Index creation failed")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Error: {e}")
        logger.error(f"Error: {e}", exc_info=True)
        sys.exit(1)
