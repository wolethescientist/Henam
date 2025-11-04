#!/usr/bin/env python3
"""
Check for duplicate indexes in the database.
This helps identify performance issues before cleanup.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_duplicates():
    """Check for duplicate indexes."""
    
    print("🔍 Checking for Duplicate Indexes")
    print("=" * 80)
    
    engine = create_engine(settings.database_url)
    
    query = """
    SELECT 
        schemaname,
        tablename,
        indexdef,
        array_agg(indexname ORDER BY indexname) as duplicate_indexes,
        count(*) as duplicate_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename, indexdef
    HAVING count(*) > 1
    ORDER BY count(*) DESC, tablename;
    """
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query)).fetchall()
            
            if result:
                print(f"Found {len(result)} groups of duplicate indexes:\n")
                
                total_duplicates = 0
                for row in result:
                    duplicate_count = row.duplicate_count - 1  # Subtract 1 to get extras
                    total_duplicates += duplicate_count
                    
                    print(f"📋 Table: {row.tablename}")
                    print(f"   Duplicates: {row.duplicate_count} identical indexes")
                    print(f"   Index names: {', '.join(row.duplicate_indexes)}")
                    print(f"   Definition: {row.indexdef[:100]}...")
                    print()
                
                print("=" * 80)
                print(f"📊 Summary:")
                print(f"   Duplicate groups: {len(result)}")
                print(f"   Total extra indexes: {total_duplicates}")
                print(f"   Storage waste: ~{total_duplicates * 10}MB (estimated)")
                print()
                print("⚠️  These duplicates are slowing down your database!")
                print("💡 Run: python scripts/cleanup_duplicate_indexes.py")
                
            else:
                print("✅ No duplicate indexes found!")
                print("Your database indexes are clean.")
                
    except Exception as e:
        print(f"❌ Error checking duplicates: {e}")
        logger.error(f"Error: {e}", exc_info=True)
        return False
    
    return True

def show_index_stats():
    """Show index usage statistics."""
    
    print("\n📈 Index Usage Statistics")
    print("=" * 80)
    
    engine = create_engine(settings.database_url)
    
    query = """
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('jobs', 'invoices', 'tasks', 'users', 'attendance', 'notifications')
    ORDER BY idx_scan DESC
    LIMIT 20;
    """
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query)).fetchall()
            
            if result:
                print(f"{'Table':<15} {'Index':<40} {'Scans':<10} {'Size':<10}")
                print("-" * 80)
                
                for row in result:
                    print(f"{row.tablename:<15} {row.indexname:<40} {row.scans:<10} {row.size:<10}")
            else:
                print("No index statistics available")
                
    except Exception as e:
        print(f"⚠️  Could not get index stats: {e}")

def main():
    """Main function."""
    
    print("🚀 Database Index Health Check")
    print("=" * 80)
    print(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'Unknown'}")
    print(f"Timestamp: {__import__('datetime').datetime.now()}")
    print()
    
    # Check for duplicates
    check_duplicates()
    
    # Show usage stats
    show_index_stats()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏹️  Check cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)
