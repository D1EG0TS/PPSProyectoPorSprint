"""add_product_brand_model_image_and_category_parent

Revision ID: 1446a36c009d
Revises: 91fb9c051f9f
Create Date: 2026-02-06 16:54:22.946928

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1446a36c009d'
down_revision: Union[str, Sequence[str], None] = '91fb9c051f9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('categories', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.add_column('products', sa.Column('brand', sa.String(length=100), nullable=True))
    op.add_column('products', sa.Column('model', sa.String(length=100), nullable=True))
    op.add_column('products', sa.Column('image_url', sa.String(length=255), nullable=True))
    op.create_index('ix_products_brand', 'products', ['brand'], unique=False)
    op.create_index('ix_products_model', 'products', ['model'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_products_model', table_name='products')
    op.drop_index('ix_products_brand', table_name='products')
    op.drop_column('products', 'image_url')
    op.drop_column('products', 'model')
    op.drop_column('products', 'brand')
    op.drop_column('categories', 'parent_id')
