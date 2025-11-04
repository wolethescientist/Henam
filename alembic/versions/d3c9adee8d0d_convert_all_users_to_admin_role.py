"""convert_all_users_to_admin_role

Revision ID: d3c9adee8d0d
Revises: 940d752b41d8
Create Date: 2025-10-02 14:41:52.826748

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


# revision identifiers, used by Alembic.
revision = 'd3c9adee8d0d'
down_revision = '940d752b41d8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # For PostgreSQL, we need to handle enum changes carefully
    # First, let's update all users to admin role using the existing enum values
    
    # Update all supervisor and staff users to admin (using uppercase)
    op.execute("UPDATE users SET role = 'ADMIN' WHERE role IN ('SUPERVISOR', 'STAFF')")
    
    # Now we need to modify the enum type to remove supervisor and staff
    # PostgreSQL requires us to create a new enum and migrate to it
    
    # Create new enum with only admin (uppercase)
    op.execute("CREATE TYPE userrole_new AS ENUM ('ADMIN')")
    
    # Alter the column to use the new enum (all users should already be admin at this point)
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE userrole_new USING role::text::userrole_new")
    
    # Drop the old enum and rename the new one
    op.execute("DROP TYPE userrole")
    op.execute("ALTER TYPE userrole_new RENAME TO userrole")


def downgrade() -> None:
    # Restore the original enum with all three roles
    # Note: This will set all users to admin since we can't restore original roles
    
    # Create the original enum with all roles (uppercase)
    op.execute("CREATE TYPE userrole_new AS ENUM ('ADMIN', 'SUPERVISOR', 'STAFF')")
    
    # Alter the column to use the restored enum
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE userrole_new USING role::text::userrole_new")
    
    # Drop the old enum and rename the new one
    op.execute("DROP TYPE userrole")
    op.execute("ALTER TYPE userrole_new RENAME TO userrole")
    
    # Note: All users will remain as 'ADMIN' since we don't have the original role data
