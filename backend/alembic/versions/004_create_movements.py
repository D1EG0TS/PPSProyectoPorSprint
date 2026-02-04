"""create_movements

Revision ID: 004_create_movements
Revises: 6ceb8d8c2af4
Create Date: 2026-02-03 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_create_movements'
down_revision: Union[str, Sequence[str], None] = '6ceb8d8c2af4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create tables
    op.create_table('movement_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', name='movementtype'), nullable=False),
        sa.Column('status', sa.Enum('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED', name='movementstatus'), nullable=False),
        sa.Column('requested_by', sa.Integer(), nullable=False),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('source_warehouse_id', sa.Integer(), nullable=True),
        sa.Column('destination_warehouse_id', sa.Integer(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('reference', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['source_warehouse_id'], ['warehouses.id'], ),
        sa.ForeignKeyConstraint(['destination_warehouse_id'], ['warehouses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_movement_requests_id'), 'movement_requests', ['id'], unique=False)

    op.create_table('movement_request_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('request_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['request_id'], ['movement_requests.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['batch_id'], ['product_batches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_movement_request_items_id'), 'movement_request_items', ['id'], unique=False)

    op.create_table('movements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('movement_request_id', sa.Integer(), nullable=True),
        sa.Column('type', sa.Enum('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', name='movementtype'), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('warehouse_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('previous_balance', sa.Integer(), nullable=False),
        sa.Column('new_balance', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['movement_request_id'], ['movement_requests.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_movements_id'), 'movements', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_movements_id'), table_name='movements')
    op.drop_table('movements')
    op.drop_index(op.f('ix_movement_request_items_id'), table_name='movement_request_items')
    op.drop_table('movement_request_items')
    op.drop_index(op.f('ix_movement_requests_id'), table_name='movement_requests')
    op.drop_table('movement_requests')
