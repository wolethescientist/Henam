"""Add standalone invoice support

Revision ID: add_standalone_invoice_support
Revises: 
Create Date: 2024-12-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_standalone_invoice_support'
down_revision = '172015856a68'
branch_labels = None
depends_on = None


def upgrade():
    # Make job_id nullable for standalone invoices
    op.alter_column('invoices', 'job_id', nullable=True)
    
    # Add new columns for standalone invoices
    op.add_column('invoices', sa.Column('job_type', sa.String(200), nullable=True))
    op.add_column('invoices', sa.Column('client_name', sa.String(200), nullable=False, server_default=''))
    op.add_column('invoices', sa.Column('job_details', sa.Text(), nullable=True))
    
    # Add conversion tracking columns
    op.add_column('invoices', sa.Column('converted_to_job', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('invoices', sa.Column('converted_job_id', sa.Integer(), nullable=True))
    
    # Add foreign key for converted_job_id
    op.create_foreign_key('fk_invoices_converted_job_id', 'invoices', 'jobs', ['converted_job_id'], ['id'])
    
    # Add new indexes
    op.create_index('ix_invoices_converted', 'invoices', ['converted_to_job'])
    op.create_index('ix_invoices_client_status', 'invoices', ['client_name', 'status'])
    
    # Update existing invoices to populate client_name from job.client
    op.execute("""
        UPDATE invoices 
        SET client_name = (
            SELECT jobs.client 
            FROM jobs 
            WHERE jobs.id = invoices.job_id
        )
        WHERE job_id IS NOT NULL
    """)


def downgrade():
    # Remove new indexes
    op.drop_index('ix_invoices_client_status', 'invoices')
    op.drop_index('ix_invoices_converted', 'invoices')
    
    # Remove foreign key
    op.drop_constraint('fk_invoices_converted_job_id', 'invoices', type_='foreignkey')
    
    # Remove new columns
    op.drop_column('invoices', 'converted_job_id')
    op.drop_column('invoices', 'converted_to_job')
    op.drop_column('invoices', 'job_details')
    op.drop_column('invoices', 'client_name')
    op.drop_column('invoices', 'job_type')
    
    # Make job_id not nullable again
    op.alter_column('invoices', 'job_id', nullable=False)