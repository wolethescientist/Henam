"""restore_performance_indexes

Revision ID: 8b12a2ef8661
Revises: a44c7d0c56de
Create Date: 2025-10-01 10:40:23.597545

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8b12a2ef8661'
down_revision = 'a44c7d0c56de'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Restore all performance indexes that were accidentally removed
    
    # User table indexes
    op.create_index('ix_users_role', 'users', ['role'], unique=False)
    op.create_index('ix_users_team_id', 'users', ['team_id'], unique=False)
    op.create_index('ix_users_supervisor_id', 'users', ['supervisor_id'], unique=False)
    
    # Task table indexes
    op.create_index('ix_tasks_status', 'tasks', ['status'], unique=False)
    op.create_index('ix_tasks_assigned_to_id', 'tasks', ['assigned_to_id'], unique=False)
    op.create_index('ix_tasks_deadline', 'tasks', ['deadline'], unique=False)
    op.create_index('ix_tasks_job_id', 'tasks', ['job_id'], unique=False)
    op.create_index('ix_tasks_assigned_status', 'tasks', ['assigned_to_id', 'status'], unique=False)
    
    # Job table indexes
    op.create_index('ix_jobs_team_id', 'jobs', ['team_id'], unique=False)
    op.create_index('ix_jobs_supervisor_id', 'jobs', ['supervisor_id'], unique=False)
    op.create_index('ix_jobs_progress', 'jobs', ['progress'], unique=False)
    op.create_index('ix_jobs_start_date', 'jobs', ['start_date'], unique=False)
    op.create_index('ix_jobs_end_date', 'jobs', ['end_date'], unique=False)
    op.create_index('ix_jobs_team_progress', 'jobs', ['team_id', 'progress'], unique=False)
    
    # Invoice table indexes
    op.create_index('ix_invoices_status', 'invoices', ['status'], unique=False)
    op.create_index('ix_invoices_job_id', 'invoices', ['job_id'], unique=False)
    op.create_index('ix_invoices_due_date', 'invoices', ['due_date'], unique=False)
    op.create_index('ix_invoices_job_status', 'invoices', ['job_id', 'status'], unique=False)
    
    # Attendance table indexes
    op.create_index('ix_attendance_staff_id', 'attendance', ['staff_id'], unique=False)
    op.create_index('ix_attendance_date', 'attendance', ['date'], unique=False)
    op.create_index('ix_attendance_status', 'attendance', ['status'], unique=False)
    op.create_index('ix_attendance_staff_date', 'attendance', ['staff_id', 'date'], unique=False)
    
    # Efficiency scores table indexes
    op.create_index('ix_efficiency_scores_user_id', 'efficiency_scores', ['user_id'], unique=False)
    op.create_index('ix_efficiency_scores_team_id', 'efficiency_scores', ['team_id'], unique=False)
    op.create_index('ix_efficiency_scores_calculated_at', 'efficiency_scores', ['calculated_at'], unique=False)


def downgrade() -> None:
    # Remove all performance indexes (in reverse order)
    
    # Efficiency scores table indexes
    op.drop_index('ix_efficiency_scores_calculated_at', table_name='efficiency_scores')
    op.drop_index('ix_efficiency_scores_team_id', table_name='efficiency_scores')
    op.drop_index('ix_efficiency_scores_user_id', table_name='efficiency_scores')
    
    # Attendance table indexes
    op.drop_index('ix_attendance_staff_date', table_name='attendance')
    op.drop_index('ix_attendance_status', table_name='attendance')
    op.drop_index('ix_attendance_date', table_name='attendance')
    op.drop_index('ix_attendance_staff_id', table_name='attendance')
    
    # Invoice table indexes
    op.drop_index('ix_invoices_job_status', table_name='invoices')
    op.drop_index('ix_invoices_due_date', table_name='invoices')
    op.drop_index('ix_invoices_job_id', table_name='invoices')
    op.drop_index('ix_invoices_status', table_name='invoices')
    
    # Job table indexes
    op.drop_index('ix_jobs_team_progress', table_name='jobs')
    op.drop_index('ix_jobs_end_date', table_name='jobs')
    op.drop_index('ix_jobs_start_date', table_name='jobs')
    op.drop_index('ix_jobs_progress', table_name='jobs')
    op.drop_index('ix_jobs_supervisor_id', table_name='jobs')
    op.drop_index('ix_jobs_team_id', table_name='jobs')
    
    # Task table indexes
    op.drop_index('ix_tasks_assigned_status', table_name='tasks')
    op.drop_index('ix_tasks_job_id', table_name='tasks')
    op.drop_index('ix_tasks_deadline', table_name='tasks')
    op.drop_index('ix_tasks_assigned_to_id', table_name='tasks')
    op.drop_index('ix_tasks_status', table_name='tasks')
    
    # User table indexes
    op.drop_index('ix_users_supervisor_id', table_name='users')
    op.drop_index('ix_users_team_id', table_name='users')
    op.drop_index('ix_users_role', table_name='users')
