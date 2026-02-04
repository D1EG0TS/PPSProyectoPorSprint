"""add approval_notes to movement_requests

Revision ID: b3ba124f35ce
Revises: 004_create_movements
Create Date: 2026-02-03 23:27:44.357121

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3ba124f35ce'
down_revision: Union[str, Sequence[str], None] = '004_create_movements'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('movement_requests', sa.Column('approval_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('movement_requests', 'approval_notes')
