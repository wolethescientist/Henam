"""Add invoice_created notification type

Revision ID: add_invoice_created_notification_type
Revises: add_standalone_invoice_support
Create Date: 2024-12-19 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_invoice_notif_type'
down_revision = 'add_standalone_invoice_support'
branch_labels = None
depends_on = None


def upgrade():
    # Add the new enum value to the existing notificationtype enum
    op.execute("ALTER TYPE notificationtype ADD VALUE 'invoice_created'")


def downgrade():
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type, which is complex
    # For now, we'll leave the enum value in place
    pass