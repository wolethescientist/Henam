#!/usr/bin/env python3
"""
List all indexes in the database with detailed usage statistics.
This helps identify which indexes are actually being used.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def list_all_indexes():
    """List all indexes with detailed information."""
    
    print("📋 Complete Index Inventory")
    print("=" * 120)
    
    engine = create_engine(settings.database_url)
    
    query = """
    SELECT 
        t.schemaname,
        t.tablename,
        t.indexname,
        t.indexdef,
        pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
        s.idx_scan as times_used,
        s.idx_tup_read as tuples_read,
        s.idx_tup_fetch as tuples_fetched,
        CASE 
            WHEN s.idx_scan = 0 THEN '❌ NEVER USED'
            WHEN s.idx_scan < 10 THEN '⚠️  RARELY USED'
            WHEN s.idx_scan < 100 THEN '🟡 LOW USAGE'
            WHEN s.idx_scan < 1000 THEN '🟢 MODERATE USAGE'
            ELSE '🔥 HIGH USAGE'
        END as usage_status
    FROM pg_indexes t
    LEFT JOIN pg_stat_user_indexes s ON t.indexname = s.indexrelname AND t.tablename = s.relname
    LEFT JOIN pg_class i ON t.indexname = i.relname
    WHERE t.schemaname = 'public'
    ORDER BY t.tablename, s.idx_scan DESC NULLS LAST, t.indexname;
    """
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query)).fetchall()
            
            if result:
                current_table = None
                table_stats = {}
                
                for row in result:
                    if row.tablename != current_table:
                        if current_table:
                            print()
                        current_table = row.tablename
                        print(f"\n{'='*120}")
                        print(f"📊 TABLE: {current_table.upper()}")
                        print(f"{'='*120}")
                        print(f"{'Index Name':<45} {'Usage':<18} {'Times Used':<12} {'Size':<10} {'Status':<15}")
                        print("-" * 120)
                        
                        if current_table not in table_stats:
                            table_stats[current_table] = {
                                'total': 0,
                                'used': 0,
                                'unused': 0,
                                'rarely_used': 0
                            }
                    
                    # Track statistics
                    table_stats[current_table]['total'] += 1
                    if row.times_used == 0 or row.times_used is None:
                        table_stats[current_table]['unused'] += 1
                    elif row.times_used < 10:
                        table_stats[current_table]['rarely_used'] += 1
                    else:
                        table_stats[current_table]['used'] += 1
                    
                    # Print index info
                    times_used = row.times_used if row.times_used is not None else 0
                    print(f"{row.indexname:<45} {row.usage_status:<18} {times_used:<12} {row.index_size:<10}")
                
                # Print summary
                print("\n" + "=" * 120)
                print("📈 SUMMARY BY TABLE")
                print("=" * 120)
                print(f"{'Table':<20} {'Total':<10} {'Used':<10} {'Rarely Used':<15} {'Unused':<10}")
                print("-" * 120)
                
                total_indexes = 0
                total_used = 0
                total_unused = 0
                total_rarely = 0
                
                for table, stats in sorted(table_stats.items()):
                    print(f"{table:<20} {stats['total']:<10} {stats['used']:<10} {stats['rarely_used']:<15} {stats['unused']:<10}")
                    total_indexes += stats['total']
                    total_used += stats['used']
                    total_unused += stats['unused']
                    total_rarely += stats['rarely_used']
                
                print("-" * 120)
                print(f"{'TOTAL':<20} {total_indexes:<10} {total_used:<10} {total_rarely:<15} {total_unused:<10}")
                
                print("\n" + "=" * 120)
                print("💡 RECOMMENDATIONS")
                print("=" * 120)
                print(f"✅ Actively used indexes: {total_used}")
                print(f"⚠️  Rarely used indexes: {total_rarely} (consider reviewing)")
                print(f"❌ Never used indexes: {total_unused} (safe to drop)")
                print(f"📊 Total indexes: {total_indexes}")
                
                if total_unused > 0:
                    print(f"\n⚠️  You have {total_unused} unused indexes wasting space and slowing writes!")
                
            else:
                print("No indexes found")
                
    except Exception as e:
        print(f"❌ Error listing indexes: {e}")
        logger.error(f"Error: {e}", exc_info=True)
        return False
    
    return True

def find_duplicate_indexes():
    """Find and group duplicate indexes."""
    
    print("\n\n🔍 DUPLICATE INDEX ANALYSIS")
    print("=" * 120)
    
    engine = create_engine(settings.database_url)
    
    query = """
    SELECT 
        tablename,
        indexdef,
        array_agg(indexname ORDER BY indexname) as duplicate_indexes,
        count(*) as duplicate_count,
        array_agg(s.idx_scan ORDER BY indexname) as usage_counts
    FROM pg_indexes t
    LEFT JOIN pg_stat_user_indexes s ON t.indexname = s.indexrelname AND t.tablename = s.relname
    WHERE schemaname = 'public'
    GROUP BY tablename, indexdef
    HAVING count(*) > 1
    ORDER BY count(*) DESC, tablename;
    """
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query)).fetchall()
            
            if result:
                print(f"Found {len(result)} groups of duplicate indexes:\n")
                
                total_waste = 0
                recommendations = []
                
                for i, row in enumerate(result, 1):
                    print(f"{i}. Table: {row.tablename}")
                    print(f"   Duplicate count: {row.duplicate_count} identical indexes")
                    print(f"   Index names:")
                    
                    # Parse usage counts
                    usage_counts = row.usage_counts if row.usage_counts else [0] * len(row.duplicate_indexes)
                    
                    # Find most used index
                    max_usage = max(usage_counts) if usage_counts else 0
                    most_used_idx = usage_counts.index(max_usage) if usage_counts else 0
                    keep_index = row.duplicate_indexes[most_used_idx]
                    
                    for j, idx_name in enumerate(row.duplicate_indexes):
                        usage = usage_counts[j] if j < len(usage_counts) else 0
                        usage = usage if usage is not None else 0
                        
                        if idx_name == keep_index:
                            print(f"      ✅ {idx_name} (KEEP - used {usage} times)")
                        else:
                            print(f"      ❌ {idx_name} (DROP - used {usage} times)")
                            recommendations.append(idx_name)
                    
                    print(f"   Definition: {row.indexdef[:80]}...")
                    print()
                    
                    total_waste += (row.duplicate_count - 1)
                
                print("=" * 120)
                print(f"📊 Duplicate Summary:")
                print(f"   Duplicate groups: {len(result)}")
                print(f"   Total redundant indexes: {total_waste}")
                print(f"   Estimated waste: ~{total_waste * 10}MB")
                
                # Save recommendations to file
                if recommendations:
                    print(f"\n💾 Saving {len(recommendations)} indexes to drop...")
                    with open('indexes_to_drop.txt', 'w') as f:
                        f.write("# Indexes recommended for deletion\n")
                        f.write("# These are duplicates of other indexes\n\n")
                        for idx in recommendations:
                            f.write(f"DROP INDEX IF EXISTS {idx};\n")
                    print(f"   Saved to: indexes_to_drop.txt")
                
            else:
                print("✅ No duplicate indexes found!")
                
    except Exception as e:
        print(f"❌ Error finding duplicates: {e}")
        logger.error(f"Error: {e}", exc_info=True)

def show_index_definitions():
    """Show detailed index definitions for key tables."""
    
    print("\n\n📖 DETAILED INDEX DEFINITIONS")
    print("=" * 120)
    
    engine = create_engine(settings.database_url)
    
    key_tables = ['jobs', 'invoices', 'tasks', 'users', 'teams', 'attendance', 'notifications']
    
    for table in key_tables:
        query = f"""
        SELECT 
            indexname,
            indexdef,
            s.idx_scan as times_used
        FROM pg_indexes t
        LEFT JOIN pg_stat_user_indexes s ON t.indexname = s.indexrelname
        WHERE t.schemaname = 'public' 
        AND t.tablename = '{table}'
        ORDER BY s.idx_scan DESC NULLS LAST;
        """
        
        try:
            with engine.connect() as conn:
                result = conn.execute(text(query)).fetchall()
                
                if result:
                    print(f"\n📋 {table.upper()}")
                    print("-" * 120)
                    for row in result:
                        times_used = row.times_used if row.times_used is not None else 0
                        print(f"   {row.indexname} (used {times_used} times)")
                        print(f"   {row.indexdef}")
                        print()
                        
        except Exception as e:
            print(f"⚠️  Error getting definitions for {table}: {e}")

def export_to_json():
    """Export all index information to JSON file."""
    
    print("\n💾 Exporting to JSON...")
    
    engine = create_engine(settings.database_url)
    
    query = """
    SELECT 
        t.tablename,
        t.indexname,
        t.indexdef,
        pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
        pg_relation_size(i.indexrelid) as index_size_bytes,
        s.idx_scan as times_used,
        s.idx_tup_read as tuples_read,
        s.idx_tup_fetch as tuples_fetched
    FROM pg_indexes t
    LEFT JOIN pg_stat_user_indexes s ON t.indexname = s.indexrelname AND t.tablename = s.relname
    LEFT JOIN pg_class i ON t.indexname = i.relname
    WHERE t.schemaname = 'public'
    ORDER BY t.tablename, t.indexname;
    """
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query)).fetchall()
            
            indexes_data = []
            for row in result:
                indexes_data.append({
                    'table': row.tablename,
                    'index_name': row.indexname,
                    'definition': row.indexdef,
                    'size': row.index_size,
                    'size_bytes': row.index_size_bytes,
                    'times_used': row.times_used if row.times_used is not None else 0,
                    'tuples_read': row.tuples_read if row.tuples_read is not None else 0,
                    'tuples_fetched': row.tuples_fetched if row.tuples_fetched is not None else 0
                })
            
            with open('database_indexes.json', 'w') as f:
                json.dump(indexes_data, f, indent=2)
            
            print(f"✅ Exported {len(indexes_data)} indexes to database_indexes.json")
            
    except Exception as e:
        print(f"❌ Error exporting to JSON: {e}")

def main():
    """Main function."""
    
    print("🚀 Complete Database Index Analysis")
    print("=" * 120)
    print(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'Unknown'}")
    print(f"Timestamp: {__import__('datetime').datetime.now()}")
    print()
    
    # List all indexes with usage
    list_all_indexes()
    
    # Find duplicates
    find_duplicate_indexes()
    
    # Show detailed definitions
    show_index_definitions()
    
    # Export to JSON
    export_to_json()
    
    print("\n" + "=" * 120)
    print("✅ Analysis complete!")
    print("\nGenerated files:")
    print("   📄 indexes_to_drop.txt - SQL commands to drop duplicate indexes")
    print("   📄 database_indexes.json - Complete index inventory in JSON format")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏹️  Analysis cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)
