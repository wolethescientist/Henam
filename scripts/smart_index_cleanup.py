#!/usr/bin/env python3
"""
Smart index cleanup based on actual usage patterns.
Removes unused indexes while keeping those needed for dashboard queries.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Indexes that are NEVER used and safe to drop
UNUSED_INDEXES_TO_DROP = [
    # JOBS - Unused indexes (keeping the ones actually used)
    "ix_jobs_team_progress",  # Not used - dashboard doesn't filter by progress
    "ix_jobs_assigner",  # Not used - duplicate of assigner_id
    "ix_jobs_team_status_created",  # Not used - have ix_jobs_created_at_desc
    "ix_jobs_status_progress",  # Not used
    "ix_jobs_client_amount",  # Not used - jobs don't have amount
    "ix_jobs_assigner_team",  # Not used
    "ix_jobs_supervisor_assigner",  # Not used
    "ix_jobs_status_created_prod",  # Not used
    "ix_jobs_supervisor_id_status_async",  # Not used - have ix_jobs_supervisor_updated
    "ix_jobs_assigner_id_status_async",  # Not used
    "idx_jobs_team_id",  # Duplicate - not used
    "idx_jobs_supervisor_id",  # Duplicate - not used
    "idx_jobs_status",  # Duplicate - not used
    "idx_jobs_team_status",  # Duplicate - not used
    "idx_jobs_title_trgm",  # Not used - no full-text search on title
    "idx_jobs_client_trgm",  # Not used - no full-text search on client
    "idx_jobs_team_updated",  # Duplicate - not used
    "idx_jobs_updated_at_desc",  # Duplicate - not used
    "ix_jobs_end_date_status",  # Not used - dashboard uses invoices for overdue
    "ix_jobs_progress",  # Not used
    "ix_jobs_start_date",  # Not used
    "ix_jobs_end_date",  # Not used
    
    # INVOICES - Unused indexes
    "ix_invoices_due_date_status_async",  # Not used
    "idx_invoices_job_id",  # Duplicate - not used (have idx_invoices_job_status)
    "ix_invoices_status_amount",  # Not used - dashboard doesn't sort by amount
    "ix_invoices_client_status",  # Not used
    "ix_invoices_converted",  # Not used
    "idx_invoices_description_trgm",  # Not used - no full-text search
    "idx_invoices_client_name_trgm",  # Not used - no full-text search
    "idx_invoices_job_type_trgm",  # Not used - no full-text search
    "ix_invoices_status_due_date",  # Not used
    "idx_invoices_status_pending_amount",  # Not used
    "ix_invoices_amount_paid",  # Not used - dashboard uses SUM aggregates
    "ix_invoices_created_at_month",  # Not used - dashboard uses DATE_TRUNC
    
    # TASKS - Almost all unused
    "ix_tasks_priority",  # Not used
    "ix_tasks_assigner",  # Not used
    "ix_tasks_assigner_assigned",  # Not used
    "ix_tasks_assigner_status",  # Not used
    "ix_tasks_created_at",  # Not used
    "ix_tasks_deadline_status",  # Not used
    "ix_tasks_job_id_status_async",  # Not used
    "idx_tasks_assigned_to_id",  # Not used
    "idx_tasks_job_id",  # Not used
    "idx_tasks_status",  # Not used
    "idx_tasks_deadline",  # Not used
    "idx_tasks_assigned_status",  # Not used
    "idx_tasks_title_trgm",  # Not used - no full-text search
    "ix_tasks_created_at_desc",  # Not used
    "idx_tasks_description_trgm",  # Not used - no full-text search
    
    # USERS - Unused duplicates
    "ix_users_id_active",  # Not used
    "idx_users_team_id",  # Not used
    "idx_users_supervisor_id",  # Not used
    "idx_users_email",  # Duplicate of unique index
    "idx_users_is_active",  # Not used
    "ix_users_team_active",  # Not used
    "ix_users_email_active",  # Not used
    "ix_users_team_active_prod",  # Not used
    "ix_users_email_active_async",  # Not used
    
    # TEAMS - Unused
    "ix_teams_supervisor_id",  # Not used
    
    # ATTENDANCE - Unused
    "ix_attendance_date_desc",  # Not used
    "ix_attendance_date_status_async",  # Not used
    "idx_attendance_staff_id",  # Not used
    "idx_attendance_date",  # Not used
    "idx_attendance_status",  # Not used
    "idx_attendance_staff_date",  # Not used
    
    # NOTIFICATIONS - Unused duplicates
    "idx_notifications_user_status_created",  # Duplicate - not used
    "idx_notifications_created_desc",  # Not used
    "ix_notifications_user_status",  # Not used
    "idx_notifications_created_at",  # Not used
    "idx_notifications_user_id",  # Not used
    "idx_notifications_status",  # Not used
]

# Indexes that SHOULD be kept (actively used or needed for dashboard)
KEEP_INDEXES = [
    # JOBS - Keep these (actively used)
    "ix_jobs_id",  # Used 229 times
    "ix_jobs_supervisor_updated",  # Used 92 times
    "ix_jobs_created_at_desc",  # Used 70 times - CRITICAL for dashboard
    "idx_jobs_updated_at",  # Used 4 times
    "idx_jobs_created_at",  # Used 2 times
    "jobs_pkey",  # Primary key
    
    # INVOICES - Keep these (actively used)
    "ix_invoices_id",  # Used 311 times
    "idx_invoices_job_status",  # Used 188 times - CRITICAL for dashboard
    "ix_invoices_created_at_desc",  # Used 43 times
    "idx_invoices_due_date",  # Used 29 times
    "ix_invoices_status_created",  # Used 12 times
    "idx_invoices_status",  # Used 9 times
    "idx_invoices_created_at",  # Used 5 times
    "invoices_invoice_number_key",  # Unique constraint
    "invoices_pkey",  # Primary key
    
    # TASKS - Keep minimal
    "ix_tasks_id",  # Used 2 times
    "tasks_pkey",  # Primary key
    
    # USERS - Keep these (heavily used)
    "ix_users_id",  # Used 1345 times
    "users_pkey",  # Used 149 times - Primary key
    "ix_users_email",  # Used 9 times - Unique constraint
    
    # TEAMS - Keep these (heavily used)
    "ix_teams_id",  # Used 2013 times
    "teams_pkey",  # Primary key
    
    # ATTENDANCE - Keep minimal
    "ix_attendance_id",  # Used 5 times
    "attendance_pkey",  # Primary key
    
    # NOTIFICATIONS - Keep these (actively used)
    "ix_notifications_user_created_status",  # Used 83 times
    "ix_notifications_id",  # Used 63 times
    "ix_notifications_user_created",  # Used 17 times
    "ix_notifications_unread",  # Used 1 time - important for unread count
    "notifications_pkey",  # Primary key
]

def analyze_dashboard_queries():
    """Show which indexes the dashboard queries should use."""
    
    print("\n🔍 Dashboard Query Analysis")
    print("=" * 80)
    
    queries = {
        "Financial Summary": [
            "invoices.status",
            "invoices.amount",
            "invoices.paid_amount",
            "jobs.team_id (via JOIN)"
        ],
        "Job Summary": [
            "jobs.status",
            "jobs.team_id",
            "jobs.progress"
        ],
        "Recent Jobs": [
            "jobs.updated_at DESC",  # ✅ ix_jobs_supervisor_updated
            "jobs.team_id"
        ],
        "Overdue Jobs": [
            "invoices.status = 'OVERDUE'",  # ✅ idx_invoices_status
            "invoices.job_id",  # ✅ idx_invoices_job_status
            "jobs.team_id"
        ],
        "Monthly Trends": [
            "invoices.created_at",  # ✅ ix_invoices_created_at_desc
            "DATE_TRUNC('month', created_at)"
        ],
        "Client Summary": [
            "jobs.client",
            "invoices.job_id",  # ✅ idx_invoices_job_status
            "invoices.amount"
        ]
    }
    
    print("Dashboard queries and their index usage:\n")
    for query_name, columns in queries.items():
        print(f"📊 {query_name}:")
        for col in columns:
            print(f"   • {col}")
        print()

def drop_unused_indexes():
    """Drop unused indexes."""
    
    print("\n🧹 Dropping Unused Indexes")
    print("=" * 80)
    print(f"Total indexes to drop: {len(UNUSED_INDEXES_TO_DROP)}")
    print(f"Indexes to keep: {len(KEEP_INDEXES)}")
    print()
    
    engine = create_engine(settings.database_url)
    
    success_count = 0
    not_found_count = 0
    error_count = 0
    
    with engine.connect() as conn:
        for i, index_name in enumerate(UNUSED_INDEXES_TO_DROP, 1):
            try:
                print(f"[{i}/{len(UNUSED_INDEXES_TO_DROP)}] Dropping {index_name}...", end=" ")
                
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
    
    print("\n" + "=" * 80)
    print("📊 Cleanup Summary:")
    print(f"   Successfully dropped: {success_count}")
    print(f"   Not found: {not_found_count}")
    print(f"   Errors: {error_count}")
    print()
    
    return success_count > 0

def show_remaining_indexes():
    """Show what indexes remain after cleanup."""
    
    print("\n📋 Remaining Indexes After Cleanup")
    print("=" * 80)
    
    engine = create_engine(settings.database_url)
    
    tables = ['jobs', 'invoices', 'tasks', 'users', 'teams', 'attendance', 'notifications']
    
    for table in tables:
        query = f"""
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public' 
        AND tablename = '{table}'
        ORDER BY indexname;
        """
        
        try:
            with engine.connect() as conn:
                result = conn.execute(text(query)).fetchall()
                
                if result:
                    print(f"\n{table.upper()} ({len(result)} indexes):")
                    for row in result:
                        status = "✅" if row.indexname in KEEP_INDEXES else "⚠️"
                        print(f"   {status} {row.indexname}")
                        
        except Exception as e:
            print(f"⚠️  Error getting indexes for {table}: {e}")

def vacuum_analyze():
    """Run VACUUM ANALYZE to reclaim space."""
    
    print("\n🔧 Running VACUUM ANALYZE...")
    print("=" * 80)
    
    engine = create_engine(settings.database_url, isolation_level="AUTOCOMMIT")
    
    tables = ['jobs', 'invoices', 'tasks', 'users', 'teams', 'attendance', 'notifications']
    
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
    
    print("🚀 Smart Index Cleanup Tool")
    print("=" * 80)
    print(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'Unknown'}")
    print(f"Timestamp: {__import__('datetime').datetime.now()}")
    print()
    
    # Show dashboard query analysis
    analyze_dashboard_queries()
    
    # Confirm before proceeding
    print("\n⚠️  WARNING: This will drop unused indexes from your database.")
    print("Only indexes that are:")
    print("  • Never used (0 scans)")
    print("  • Not needed for dashboard queries")
    print("  • Duplicates of other indexes")
    print()
    print(f"Will drop: {len(UNUSED_INDEXES_TO_DROP)} indexes")
    print(f"Will keep: {len(KEEP_INDEXES)} indexes")
    print()
    
    if os.getenv('AUTO_CONFIRM') != 'true':
        response = input("Do you want to proceed? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("❌ Cleanup cancelled")
            return False
    
    # Drop unused indexes
    success = drop_unused_indexes()
    
    if success:
        # Show remaining indexes
        show_remaining_indexes()
        
        # Run VACUUM ANALYZE
        vacuum_analyze()
        
        print("\n" + "=" * 80)
        print("✅ Cleanup Complete!")
        print("\n📈 Expected Improvements:")
        print("   • Dashboard load time: 3.16s → ~0.5s")
        print("   • Faster INSERT/UPDATE operations")
        print("   • Reduced storage usage")
        print("   • Better query planner decisions")
        print("\n📝 Next Steps:")
        print("   1. Test dashboard: curl http://localhost:8000/dashboard/unified")
        print("   2. Monitor response times in logs")
        print("   3. Check database size reduction")
        
        return True
    else:
        print("\n❌ Cleanup failed")
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
