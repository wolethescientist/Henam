#!/usr/bin/env python3
"""
Add critical database indexes for production performance.
Run this script during a maintenance window.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_critical_indexes():
    """Add critical indexes for dashboard and API performance."""
    
    print("🔧 Adding Critical Database Indexes for Production...")
    print("=" * 60)
    
    # Create engine - use autocommit only for CONCURRENT indexes
    use_concurrent = os.getenv('USE_CONCURRENT_INDEXES', 'true').lower() == 'true'
    
    if use_concurrent:
        engine = create_engine(settings.database_url, isolation_level="AUTOCOMMIT")
    else:
        engine = create_engine(settings.database_url)
    
    # Check if we should use CONCURRENTLY (production) or regular (development)
    use_concurrent = os.getenv('USE_CONCURRENT_INDEXES', 'true').lower() == 'true'
    concurrent_keyword = "CONCURRENTLY" if use_concurrent else ""
    
    print(f"Index creation mode: {'CONCURRENT (production)' if use_concurrent else 'REGULAR (development)'}")
    
    # Critical indexes for dashboard performance
    indexes = [
        # Financial summary indexes (invoices don't have team_id, they link via job_id)
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_invoices_amount_paid 
           ON invoices(amount, paid_amount) 
           WHERE amount IS NOT NULL""",
        
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_invoices_status_amount 
           ON invoices(status, amount DESC) 
           WHERE status IS NOT NULL""",
        
        # Job summary indexes
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_jobs_team_status_created 
           ON jobs(team_id, status, created_at DESC) 
           WHERE team_id IS NOT NULL""",
        
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_jobs_status_progress 
           ON jobs(status, progress) 
           WHERE status IS NOT NULL""",
        
        # Recent jobs indexes
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_jobs_updated_at_desc 
           ON jobs(updated_at DESC, team_id)""",
        
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_jobs_created_at_desc 
           ON jobs(created_at DESC, team_id)""",
        
        # Overdue jobs indexes (use correct enum values)
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_jobs_end_date_status 
           ON jobs(end_date, status) 
           WHERE end_date IS NOT NULL AND status != 'COMPLETED'""",
        
        # Monthly trends indexes (simplified without DATE_TRUNC function)
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_invoices_created_at_month 
           ON invoices(created_at) 
           WHERE created_at IS NOT NULL""",
        
        # Client summary indexes
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_jobs_client_amount 
           ON jobs(client) 
           WHERE client IS NOT NULL""",
        
        # User and team performance indexes
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_users_team_active 
           ON users(team_id, is_active) 
           WHERE is_active = true""",
        
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_tasks_assigned_status 
           ON tasks(assigned_to_id, status, created_at DESC)""",
        
        # Authentication and session indexes
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_users_email_active 
           ON users(email, is_active) 
           WHERE is_active = true""",
        
        # Notification indexes
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_notifications_user_created 
           ON notifications(user_id, created_at DESC)""",
        
        # Invoice-Job relationship index
        f"""CREATE INDEX {concurrent_keyword} IF NOT EXISTS ix_invoices_job_id 
           ON invoices(job_id) 
           WHERE job_id IS NOT NULL""",
    ]
    
    success_count = 0
    total_indexes = len(indexes)
    
    try:
        if use_concurrent:
            # Use autocommit connection for CONCURRENT index creation
            conn = engine.connect()
            
            for i, index_sql in enumerate(indexes, 1):
                try:
                    print(f"[{i}/{total_indexes}] Creating index...")
                    
                    # Extract index name for logging
                    index_name = "unknown"
                    if "ix_" in index_sql:
                        index_name = index_sql.split("ix_")[1].split(" ")[0]
                    
                    # Execute index creation (no transaction needed with autocommit)
                    conn.execute(text(index_sql))
                    
                    print(f"✅ Created index: ix_{index_name}")
                    success_count += 1
                    
                except Exception as e:
                    error_msg = str(e).lower()
                    if "already exists" in error_msg or "duplicate" in error_msg:
                        print(f"⚠️  Index ix_{index_name} already exists")
                        success_count += 1
                    else:
                        print(f"❌ Failed to create index ix_{index_name}: {e}")
                        logger.error(f"Index creation failed: {e}")
            
            conn.close()
        else:
            # Use regular transaction for non-concurrent index creation
            with engine.connect() as conn:
                for i, index_sql in enumerate(indexes, 1):
                    try:
                        print(f"[{i}/{total_indexes}] Creating index...")
                        
                        # Extract index name for logging
                        index_name = "unknown"
                        if "ix_" in index_sql:
                            index_name = index_sql.split("ix_")[1].split(" ")[0]
                        
                        # Execute index creation
                        conn.execute(text(index_sql))
                        conn.commit()
                        
                        print(f"✅ Created index: ix_{index_name}")
                        success_count += 1
                        
                    except Exception as e:
                        error_msg = str(e).lower()
                        if "already exists" in error_msg or "duplicate" in error_msg:
                            print(f"⚠️  Index ix_{index_name} already exists")
                            success_count += 1
                        else:
                            print(f"❌ Failed to create index ix_{index_name}: {e}")
                            logger.error(f"Index creation failed: {e}")
                            conn.rollback()
        
        print("\n" + "=" * 60)
        print(f"📊 Index Creation Summary:")
        print(f"   Total indexes: {total_indexes}")
        print(f"   Successful: {success_count}")
        print(f"   Failed: {total_indexes - success_count}")
        
        if success_count == total_indexes:
            print("🎉 All indexes created successfully!")
        elif success_count > 0:
            print("⚠️  Some indexes created successfully, check logs for failures")
        else:
            print("❌ No indexes were created successfully")
            
    except Exception as e:
        print(f"❌ Critical error during index creation: {e}")
        logger.error(f"Critical error: {e}")
        return False
    
    return success_count > 0

def analyze_index_usage():
    """Analyze current index usage (PostgreSQL specific)."""
    
    print("\n🔍 Analyzing Current Index Usage...")
    print("=" * 60)
    
    engine = create_engine(settings.database_url)
    
    # Query to check index usage
    usage_query = """
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        CASE 
            WHEN idx_tup_read = 0 THEN 'UNUSED'
            WHEN idx_tup_read < 1000 THEN 'LOW_USAGE'
            WHEN idx_tup_read < 10000 THEN 'MEDIUM_USAGE'
            ELSE 'HIGH_USAGE'
        END as usage_level
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
    ORDER BY idx_tup_read DESC
    LIMIT 20;
    """
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(usage_query)).fetchall()
            
            if result:
                print("📈 Top 20 Index Usage Statistics:")
                print(f"{'Index Name':<30} {'Table':<15} {'Reads':<10} {'Usage':<12}")
                print("-" * 70)
                
                for row in result:
                    print(f"{row.indexname:<30} {row.tablename:<15} {row.idx_tup_read:<10} {row.usage_level:<12}")
            else:
                print("No index usage statistics available")
                
    except Exception as e:
        print(f"⚠️  Could not analyze index usage: {e}")
        print("This is normal if not using PostgreSQL or insufficient permissions")

def main():
    """Main function to add indexes and analyze usage."""
    
    print("🚀 Critical Database Index Management")
    print("=" * 60)
    print(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'Unknown'}")
    print(f"Timestamp: {__import__('datetime').datetime.now()}")
    print()
    
    # Add critical indexes
    success = add_critical_indexes()
    
    if success:
        # Analyze index usage
        analyze_index_usage()
        
        print("\n📝 Next Steps:")
        print("1. Monitor query performance after index creation")
        print("2. Check application logs for improved response times")
        print("3. Run ANALYZE on tables to update statistics:")
        print("   ANALYZE jobs, invoices, users, teams, tasks;")
        print("4. Monitor index usage over time")
        
        return True
    else:
        print("\n❌ Index creation failed. Check database permissions and connectivity.")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Index creation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)