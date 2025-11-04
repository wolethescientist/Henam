"""add_performance_indexes

Revision ID: 46f7ce626181
Revises: b19c859f4022
Create Date: 2025-10-01 08:02:57.540035

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '46f7ce626181'
down_revision = 'b19c859f4022'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add indexes for frequently queried columns to improve performance
    
    # Job table indexes
    op.create_index('ix_jobs_team_id', 'jobs', ['team_id'])
    op.create_index('ix_jobs_supervisor_id', 'jobs', ['supervisor_id'])
    op.create_index('ix_jobs_start_date', 'jobs', ['start_date'])
    op.create_index('ix_jobs_end_date', 'jobs', ['end_date'])
    op.create_index('ix_jobs_progress', 'jobs', ['progress'])
    
    # Task table indexes
    op.create_index('ix_tasks_assigned_to_id', 'tasks', ['assigned_to_id'])
    op.create_index('ix_tasks_job_id', 'tasks', ['job_id'])
    op.create_index('ix_tasks_status', 'tasks', ['status'])
    op.create_index('ix_tasks_deadline', 'tasks', ['deadline'])
    
    # Invoice table indexes
    op.create_index('ix_invoices_job_id', 'invoices', ['job_id'])
    op.create_index('ix_invoices_status', 'invoices', ['status'])
    op.create_index('ix_invoices_due_date', 'invoices', ['due_date'])
    
    # Attendance table indexes
    op.create_index('ix_attendance_staff_id', 'attendance', ['staff_id'])
    op.create_index('ix_attendance_date', 'attendance', ['date'])
    op.create_index('ix_attendance_status', 'attendance', ['status'])
    
    # Efficiency scores table indexes
    op.create_index('ix_efficiency_scores_user_id', 'efficiency_scores', ['user_id'])
    op.create_index('ix_efficiency_scores_team_id', 'efficiency_scores', ['team_id'])
    op.create_index('ix_efficiency_scores_calculated_at', 'efficiency_scores', ['calculated_at'])
    
    # User table indexes
    op.create_index('ix_users_team_id', 'users', ['team_id'])
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_supervisor_id', 'users', ['supervisor_id'])
    
    # Composite indexes for common query patterns
    op.create_index('ix_jobs_team_progress', 'jobs', ['team_id', 'progress'])
    op.create_index('ix_tasks_assigned_status', 'tasks', ['assigned_to_id', 'status'])
    op.create_index('ix_attendance_staff_date', 'attendance', ['staff_id', 'date'])
    op.create_index('ix_invoices_job_status', 'invoices', ['job_id', 'status'])


def downgrade() -> None:
    # Drop all the indexes we created
    op.drop_index('ix_invoices_job_status', table_name='invoices')
    op.drop_index('ix_attendance_staff_date', table_name='attendance')
    op.drop_index('ix_tasks_assigned_status', table_name='tasks')
    op.drop_index('ix_jobs_team_progress', table_name='jobs')
    
    op.drop_index('ix_users_supervisor_id', table_name='users')
    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_team_id', table_name='users')
    
    op.drop_index('ix_efficiency_scores_calculated_at', table_name='efficiency_scores')
    op.drop_index('ix_efficiency_scores_team_id', table_name='efficiency_scores')
    op.drop_index('ix_efficiency_scores_user_id', table_name='efficiency_scores')
    
    op.drop_index('ix_attendance_status', table_name='attendance')
    op.drop_index('ix_attendance_date', table_name='attendance')
    op.drop_index('ix_attendance_staff_id', table_name='attendance')
    
    op.drop_index('ix_invoices_due_date', table_name='invoices')
    op.drop_index('ix_invoices_status', table_name='invoices')
    op.drop_index('ix_invoices_job_id', table_name='invoices')
    
    op.drop_index('ix_tasks_deadline', table_name='tasks')
    op.drop_index('ix_tasks_status', table_name='tasks')
    op.drop_index('ix_tasks_job_id', table_name='tasks')
    op.drop_index('ix_tasks_assigned_to_id', table_name='tasks')
    
    op.drop_index('ix_jobs_progress', table_name='jobs')
    op.drop_index('ix_jobs_end_date', table_name='jobs')
    op.drop_index('ix_jobs_start_date', table_name='jobs')
    op.drop_index('ix_jobs_supervisor_id', table_name='jobs')
    op.drop_index('ix_jobs_team_id', table_name='jobs')
