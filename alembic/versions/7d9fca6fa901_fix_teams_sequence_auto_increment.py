"""fix_teams_sequence_auto_increment

Revision ID: 7d9fca6fa901
Revises: d7b489969a16
Create Date: 2025-09-30 12:31:09.670111

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7d9fca6fa901'
down_revision = 'd7b489969a16'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fix the teams sequence to start from the correct value
    # This ensures auto-increment works properly
    op.execute("""
        SELECT setval('teams_id_seq', 
            COALESCE((SELECT MAX(id) FROM teams), 0) + 1, 
            false
        )
    """)


def downgrade() -> None:
    # No need to downgrade this fix
    pass
