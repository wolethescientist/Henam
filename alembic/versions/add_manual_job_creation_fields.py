"""add_manual_job_creation_fields

Revision ID: add_manual_job_creation
Revises: 
Create Date: 2025-12-05 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_manual_job_creation'
down_revision = None  # Set this to your current head revision
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create JobCreationSource enum
    job_creation_source_enum = postgresql.ENUM('MANUAL', 'AUTO_FROM_INVOICE', name='jobcreationsource')
    job_creation_source_enum.create(op.get_bind(), checkfirst=True)
    
    # Create JobAuditEventType enum
    job_audit_event_type_enum = postgresql.ENUM(
        'JOB_CREATED', 
        'DUPLICATE_WARNING_SHOWN', 
        'DUPLICATE_OVERRIDE', 
        'INVOICE_LINKED', 
        'JOB_UPDATED', 
        'JOB_MERGED', 
        name='jobauditeventtype'
    )
    job_audit_event_type_enum.create(op.get_bind(), checkfirst=True)
    
    # Add new columns to jobs table
    op.add_column('jobs', sa.Column('creation_source', sa.Enum('MANUAL', 'AUTO_FROM_INVOICE', name='jobcreationsource'), nullable=False, server_default='MANUAL'))
    op.add_column('jobs', sa.Column('originating_invoice_id', sa.Integer(), nullable=True))
    op.add_column('jobs', sa.Column('duplicate_override', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('jobs', sa.Column('duplicate_justification', sa.Text(), nullable=True))
    
    # Add foreign key constraint for originating_invoice_id
    op.create_foreign_key('fk_jobs_originating_invoice', 'jobs', 'invoices', ['originating_invoice_id'], ['id'])
    
    # Create indexes for new job fields
    op.create_index('ix_jobs_creation_source', 'jobs', ['creation_source'], unique=False)
    op.create_index('ix_jobs_originating_invoice_id', 'jobs', ['originating_invoice_id'], unique=False)
    op.create_index('ix_jobs_duplicate_override', 'jobs', ['duplicate_override'], unique=False)
    
    # Create indexes for duplicate detection (case-insensitive)
    op.execute('CREATE INDEX ix_jobs_client_lower ON jobs (LOWER(client))')
    op.execute('CREATE INDEX ix_jobs_title_lower ON jobs (LOWER(title))')
    op.create_index('ix_jobs_client_title_status', 'jobs', ['client', 'title', 'status'], unique=False)
    op.create_index('ix_jobs_client_status', 'jobs', ['client', 'status'], unique=False)
    
    # Create job_audit_logs table
    op.create_table('job_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.Enum('JOB_CREATED', 'DUPLICATE_WARNING_SHOWN', 'DUPLICATE_OVERRIDE', 'INVOICE_LINKED', 'JOB_UPDATED', 'JOB_MERGED', name='jobauditeventtype'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('event_data', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for job_audit_logs
    op.create_index(op.f('ix_job_audit_logs_id'), 'job_audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_job_audit_logs_job_id'), 'job_audit_logs', ['job_id'], unique=False)
    op.create_index(op.f('ix_job_audit_logs_event_type'), 'job_audit_logs', ['event_type'], unique=False)
    op.create_index(op.f('ix_job_audit_logs_user_id'), 'job_audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_job_audit_logs_timestamp'), 'job_audit_logs', ['timestamp'], unique=False)
    op.create_index('ix_job_audit_logs_job_timestamp', 'job_audit_logs', ['job_id', 'timestamp'], unique=False)
    op.create_index('ix_job_audit_logs_user_timestamp', 'job_audit_logs', ['user_id', 'timestamp'], unique=False)


def downgrade() -> None:
    # Drop job_audit_logs indexes
    op.drop_index('ix_job_audit_logs_user_timestamp', table_name='job_audit_logs')
    op.drop_index('ix_job_audit_logs_job_timestamp', table_name='job_audit_logs')
    op.drop_index(op.f('ix_job_audit_logs_timestamp'), table_name='job_audit_logs')
    op.drop_index(op.f('ix_job_audit_logs_user_id'), table_name='job_audit_logs')
    op.drop_index(op.f('ix_job_audit_logs_event_type'), table_name='job_audit_logs')
    op.drop_index(op.f('ix_job_audit_logs_job_id'), table_name='job_audit_logs')
    op.drop_index(op.f('ix_job_audit_logs_id'), table_name='job_audit_logs')
    
    # Drop job_audit_logs table
    op.drop_table('job_audit_logs')
    
    # Drop indexes for duplicate detection
    op.drop_index('ix_jobs_client_status', table_name='jobs')
    op.drop_index('ix_jobs_client_title_status', table_name='jobs')
    op.execute('DROP INDEX IF EXISTS ix_jobs_title_lower')
    op.execute('DROP INDEX IF EXISTS ix_jobs_client_lower')
    
    # Drop indexes for new job fields
    op.drop_index('ix_jobs_duplicate_override', table_name='jobs')
    op.drop_index('ix_jobs_originating_invoice_id', table_name='jobs')
    op.drop_index('ix_jobs_creation_source', table_name='jobs')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_jobs_originating_invoice', 'jobs', type_='foreignkey')
    
    # Drop new columns from jobs table
    op.drop_column('jobs', 'duplicate_justification')
    op.drop_column('jobs', 'duplicate_override')
    op.drop_column('jobs', 'originating_invoice_id')
    op.drop_column('jobs', 'creation_source')
    
    # Drop enums
    job_audit_event_type_enum = postgresql.ENUM(name='jobauditeventtype')
    job_audit_event_type_enum.drop(op.get_bind(), checkfirst=True)
    
    job_creation_source_enum = postgresql.ENUM(name='jobcreationsource')
    job_creation_source_enum.drop(op.get_bind(), checkfirst=True)
