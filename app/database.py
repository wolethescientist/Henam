from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create engine with connection pooling configuration
# This prevents hitting Supabase connection limits by reusing connections
engine = create_engine(
    settings.database_url,
    pool_size=settings.db_pool_size,        # Base number of connections to maintain
    max_overflow=settings.db_max_overflow,  # Additional connections on demand
    pool_timeout=settings.db_pool_timeout,  # Seconds to wait for connection
    pool_recycle=settings.db_pool_recycle,  # Recycle connections after 1 hour
    pool_pre_ping=settings.db_pool_pre_ping, # Validate connections before use
    echo=settings.sql_echo  # Control SQL query logging via config
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_pool_status():
    """Get connection pool status for monitoring"""
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "invalid": pool.invalid()
    }


def fix_sequences():
    """Fix all database sequences to prevent duplicate key violations"""
    db = SessionLocal()
    try:
        tables_and_sequences = [
            ('teams', 'teams_id_seq'),
            ('users', 'users_id_seq'),
            ('jobs', 'jobs_id_seq'),
            ('tasks', 'tasks_id_seq'),
            ('invoices', 'invoices_id_seq'),
            ('attendance', 'attendance_id_seq'),
            ('efficiency_scores', 'efficiency_scores_id_seq'),
            ('performance_metrics', 'performance_metrics_id_seq'),
            ('notifications', 'notifications_id_seq'),
            ('reminders', 'reminders_id_seq')
        ]
        
        for table, sequence in tables_and_sequences:
            try:
                # Get max ID from table
                result = db.execute(text(f'SELECT MAX(id) FROM {table}'))
                max_id = result.scalar() or 0
                
                # Reset sequence to start from max_id + 1
                next_val = max_id + 1
                db.execute(text(f'SELECT setval(\'{sequence}\', {next_val}, false)'))
                print(f'Fixed {sequence} to start from {next_val}')
                
            except Exception as e:
                print(f'Error fixing {sequence}: {e}')
        
        db.commit()
        print('All sequences fixed successfully!')
        
    except Exception as e:
        print(f'Error fixing sequences: {e}')
        db.rollback()
    finally:
        db.close()
