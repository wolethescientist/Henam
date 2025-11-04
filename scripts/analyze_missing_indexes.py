#!/usr/bin/env python3
"""
Analyze which indexes are missing based on actual query patterns.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

# Based on frontend API calls and backend queries
MISSING_INDEXES = {
    "jobs": [
        # GET /jobs with filters - needs composite indexes
        ("team_id", "status", "created_at DESC"),  # Filtered by team + status, sorted by created_at
        ("supervisor_id", "status", "created_at DESC"),  # Filtered by supervisor + status
        ("status", "created_at DESC"),  # Filtered by status only
        
        # Dashboard queries - CRITICAL
        ("team_id", "status"),  # Job summary by team - COUNT aggregation
        ("team_id", "updated_at DESC"),  # Recent jobs by team - already have ix_jobs_supervisor_updated
        ("status", "progress"),  # Job summary - AVG(progress) by status
    ],
    
    "invoices": [
        # GET /invoices with filters
        ("status", "created_at DESC"),  # Already exists: ix_invoices_status_created ✅
        ("job_id", "status", "created_at DESC"),  # Filtered by job + status
        
        # Dashboard - CRITICAL for financial summary
        ("status", "amount", "paid_amount"),  # Financial aggregations - SUM by status
        ("created_at", "amount", "paid_amount"),  # Monthly trends - DATE_TRUNC + SUM
        
        # Dashboard - client summary  
        ("job_id", "amount", "paid_amount", "status"),  # Client revenue by job
        
        # Overdue invoices - CRITICAL
        ("status", "pending_amount"),  # Overdue amount calculation
    ],
    
    "tasks": [
        # GET /tasks with filters
        ("assigned_to_id", "status", "created_at DESC"),  # My tasks filtered by status
        ("assigner_id", "status", "created_at DESC"),  # Tasks I assigned
        ("job_id", "status"),  # Tasks for a job
        ("status", "deadline"),  # Tasks by status and deadline
    ],
    
    "users": [
        # GET /users with filters
        ("team_id", "is_active"),  # Team members who are active
        ("is_active", "created_at DESC"),  # Active users sorted by join date
    ],
    
    "notifications": [
        # GET /notifications/unread - already has ix_notifications_unread ✅
        ("user_id", "status", "created_at DESC"),  # Already exists: ix_notifications_user_created_status ✅
    ],
    
    "attendance": [
        # GET /unified/attendance with filters
        ("staff_id", "date DESC"),  # User attendance history
        ("date", "status"),  # Attendance by date and status
    ],
}

def check_existing_indexes():
    """Check which indexes already exist."""
    
    print("🔍 Checking Existing vs Missing Indexes")
    print("=" * 100)
    
    engine = create_engine(settings.database_url)
    
    for table, needed_indexes in MISSING_INDEXES.items():
        print(f"\n📋 {table.upper()}")
        print("-" * 100)
        
        # Get existing indexes for this table
        query = f"""
        SELECT 
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' 
        AND tablename = '{table}'
        ORDER BY indexname;
        """
        
        try:
            with engine.connect() as conn:
                result = conn.execute(text(query)).fetchall()
                existing = {row.indexname: row.indexdef for row in result}
                
                for columns in needed_indexes:
                    columns_str = ", ".join(columns)
                    
                    # Check if similar index exists
                    found = False
                    for idx_name, idx_def in existing.items():
                        # Simple check - see if all columns are in the index definition
                        if all(col.split()[0] in idx_def.lower() for col in columns):
                            print(f"   ✅ {columns_str}")
                            print(f"      Exists as: {idx_name}")
                            found = True
                            break
                    
                    if not found:
                        print(f"   ❌ MISSING: {columns_str}")
                        
        except Exception as e:
            print(f"   ⚠️  Error checking {table}: {e}")

def generate_create_statements():
    """Generate CREATE INDEX statements for missing indexes."""
    
    print("\n\n📝 CREATE INDEX Statements for Missing Indexes")
    print("=" * 100)
    
    statements = []
    
    for table, needed_indexes in MISSING_INDEXES.items():
        print(f"\n-- {table.upper()}")
        
        for i, columns in enumerate(needed_indexes, 1):
            # Generate index name
            col_names = "_".join([col.split()[0].replace(",", "") for col in columns])
            index_name = f"ix_{table}_{col_names}"[:63]  # PostgreSQL limit
            
            # Generate column list
            col_list = ", ".join(columns)
            
            # Generate CREATE statement
            stmt = f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} ON {table}({col_list});"
            statements.append(stmt)
            print(f"   {stmt}")
    
    # Save to file
    with open('missing_indexes.sql', 'w') as f:
        f.write("-- Missing indexes identified from query analysis\n")
        f.write("-- Run these to improve query performance\n\n")
        for stmt in statements:
            f.write(stmt + "\n")
    
    print(f"\n💾 Saved {len(statements)} statements to missing_indexes.sql")

def analyze_query_patterns():
    """Show which queries would benefit from indexes."""
    
    print("\n\n📊 Query Pattern Analysis")
    print("=" * 100)
    
    patterns = {
        "Dashboard - Recent Jobs": {
            "query": "SELECT * FROM jobs WHERE team_id = ? ORDER BY updated_at DESC LIMIT 5",
            "needs": "ix_jobs_team_id_updated_at_desc",
            "impact": "HIGH - Called on every dashboard load"
        },
        "Dashboard - Overdue Jobs": {
            "query": "SELECT * FROM jobs j JOIN invoices i ON j.id = i.job_id WHERE i.status = 'OVERDUE'",
            "needs": "ix_invoices_status_job_id (already exists as idx_invoices_job_status)",
            "impact": "HIGH - Called on every dashboard load"
        },
        "Jobs List - Filtered": {
            "query": "SELECT * FROM jobs WHERE team_id = ? AND status = ? ORDER BY created_at DESC",
            "needs": "ix_jobs_team_id_status_created_at_desc",
            "impact": "MEDIUM - Called when filtering jobs"
        },
        "My Tasks": {
            "query": "SELECT * FROM tasks WHERE assigned_to_id = ? AND status = ? ORDER BY created_at DESC",
            "needs": "ix_tasks_assigned_to_id_status_created_at_desc",
            "impact": "MEDIUM - Called on tasks page"
        },
        "Invoices - By Status": {
            "query": "SELECT * FROM invoices WHERE status = ? ORDER BY created_at DESC",
            "needs": "ix_invoices_status_created_at_desc (already exists)",
            "impact": "MEDIUM - Called when filtering invoices"
        },
    }
    
    for query_name, info in patterns.items():
        print(f"\n{query_name}")
        print(f"   Query: {info['query']}")
        print(f"   Needs: {info['needs']}")
        print(f"   Impact: {info['impact']}")

def main():
    """Main function."""
    
    print("🚀 Missing Index Analysis")
    print("=" * 100)
    print(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'Unknown'}")
    print()
    
    # Check existing indexes
    check_existing_indexes()
    
    # Generate CREATE statements
    generate_create_statements()
    
    # Analyze query patterns
    analyze_query_patterns()
    
    print("\n" + "=" * 100)
    print("✅ Analysis complete!")
    print("\nNext steps:")
    print("1. Review missing_indexes.sql")
    print("2. Run: psql -f missing_indexes.sql")
    print("3. Monitor query performance improvements")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n💥 Error: {e}")
        sys.exit(1)
