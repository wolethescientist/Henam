"""add_all_missing_notification_types

Revision ID: bce80d5bb28f
Revises: 5c6093bf6b92
Create Date: 2025-10-17 12:19:13.117881

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bce80d5bb28f'
down_revision = '5c6093bf6b92'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add all missing enum values to the existing notificationtype enum
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'job_created'")
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'job_updated'")
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'task_created'")
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'task_updated'")
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'invoice_created'")


def downgrade() -> None:
    pass
