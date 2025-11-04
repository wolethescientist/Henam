"""fix_all_sequences_auto_increment

Revision ID: 4eeedebc1852
Revises: 7d9fca6fa901
Create Date: 2025-09-30 12:32:13.655064

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4eeedebc1852'
down_revision = '7d9fca6fa901'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fix all sequences to ensure auto-increment works properly
    # This prevents duplicate key violations when creating new records
    
    tables_and_sequences = [
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
        op.execute(f"""
            SELECT setval('{sequence}', 
                COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, 
                false
            )
        """)


def downgrade() -> None:
    # No need to downgrade this fix
    pass
