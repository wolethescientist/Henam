"""make job end_date nullable

Revision ID: make_job_end_date_nullable
Revises: bce80d5bb28f
Create Date: 2025-11-03 13:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'make_job_end_date_nullable'
down_revision = 'bce80d5bb28f'
branch_labels = None
depends_on = None


def upgrade():
    # Make end_date nullable in jobs table
    op.alter_column('jobs', 'end_date',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=True)


def downgrade():
    # Make end_date not nullable again
    op.alter_column('jobs', 'end_date',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=False)
