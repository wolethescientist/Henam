"""add_composite_index_for_role_team_filtering

Revision ID: 940d752b41d8
Revises: 8b12a2ef8661
Create Date: 2025-10-01 10:57:18.783361

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '940d752b41d8'
down_revision = '8b12a2ef8661'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add composite index for role and team_id filtering
    op.create_index('ix_users_role_team_id', 'users', ['role', 'team_id'], unique=False)
    
    # Add composite index for role and supervisor_id filtering
    op.create_index('ix_users_role_supervisor_id', 'users', ['role', 'supervisor_id'], unique=False)


def downgrade() -> None:
    # Remove composite indexes
    op.drop_index('ix_users_role_supervisor_id', table_name='users')
    op.drop_index('ix_users_role_team_id', table_name='users')
