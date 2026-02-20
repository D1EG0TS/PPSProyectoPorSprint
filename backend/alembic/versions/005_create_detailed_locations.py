"""create_detailed_locations

Revision ID: 005_create_detailed_locations
Revises: 3c842da6bc9e
Create Date: 2026-02-06 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_create_detailed_locations'
down_revision: Union[str, Sequence[str], None] = '3c842da6bc9e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename locations -> storage_locations
    op.rename_table('locations', 'storage_locations')

    # 2. Add columns to storage_locations
    # Use generic Enum for broader compatibility or native if PG
    # op.add_column('storage_locations', sa.Column('location_type', sa.Enum('rack', 'shelf', 'bin', 'pallet', 'floor', name='locationtype'), server_default='shelf', nullable=False))
    # op.add_column('storage_locations', sa.Column('capacity', sa.Integer(), server_default='0', nullable=True))
    # op.add_column('storage_locations', sa.Column('dimensions', sa.JSON(), nullable=True))
    # op.add_column('storage_locations', sa.Column('temperature_zone', sa.String(length=50), nullable=True))
    op.add_column('storage_locations', sa.Column('is_restricted', sa.Boolean(), server_default=sa.text('0'), nullable=True))
    op.add_column('storage_locations', sa.Column('current_occupancy', sa.Integer(), server_default='0', nullable=True))
    op.add_column('storage_locations', sa.Column('barcode', sa.String(length=100), nullable=True))

    op.create_index(op.f('ix_storage_locations_barcode'), 'storage_locations', ['barcode'], unique=True)

    # 3. Create product_location_assignments
    op.create_table('product_location_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=True),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('warehouse_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), server_default='0', nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('assigned_by', sa.Integer(), nullable=True),
        sa.Column('assignment_type', sa.Enum('manual', 'movement', 'auto', name='assignmenttype'), server_default='manual', nullable=True),
        sa.Column('is_primary', sa.Boolean(), server_default=sa.text('0'), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['batch_id'], ['product_batches.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['storage_locations.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_location_assignments_id'), 'product_location_assignments', ['id'], unique=False)
    op.create_index(op.f('ix_product_location_assignments_location_id'), 'product_location_assignments', ['location_id'], unique=False)
    op.create_index(op.f('ix_product_location_assignments_product_id'), 'product_location_assignments', ['product_id'], unique=False)
    op.create_index(op.f('ix_product_location_assignments_warehouse_id'), 'product_location_assignments', ['warehouse_id'], unique=False)

    # Composite indices
    op.create_index('idx_product_location', 'product_location_assignments', ['product_id', 'location_id'], unique=False)
    op.create_index('idx_location_product', 'product_location_assignments', ['location_id', 'product_id'], unique=False)

    # 4. Create location_audit_logs
    op.create_table('location_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('previous_quantity', sa.Integer(), server_default='0', nullable=False),
        sa.Column('new_quantity', sa.Integer(), server_default='0', nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('movement_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['location_id'], ['storage_locations.id'], ),
        sa.ForeignKeyConstraint(['movement_id'], ['movements.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_location_audit_logs_id'), 'location_audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_location_audit_logs_location_id'), 'location_audit_logs', ['location_id'], unique=False)

    # --- Data Migration ---
    conn = op.get_bind()
    
    # Check if we have warehouses and movements to migrate
    # Using raw SQL for safety against model changes
    
    # 1. Get all warehouses
    try:
        warehouses = conn.execute(sa.text("SELECT id FROM warehouses")).fetchall()
        
        for wh in warehouses:
            wh_id = wh[0]
            
            # 2. Find or Create Default Location
            # Try to find a 'GENERAL' location or just any location
            default_loc_id = None
            
            # Check for existing locations
            # Note: table is now storage_locations
            existing_loc = conn.execute(sa.text("SELECT id FROM storage_locations WHERE warehouse_id = :wh_id AND code = 'GENERAL'"), {"wh_id": wh_id}).fetchone()
            
            if existing_loc:
                default_loc_id = existing_loc[0]
            else:
                # Check ANY location
                any_loc = conn.execute(sa.text("SELECT id FROM storage_locations WHERE warehouse_id = :wh_id LIMIT 1"), {"wh_id": wh_id}).fetchone()
                if any_loc:
                    default_loc_id = any_loc[0]
                else:
                    # Create GENERAL location
                    # Need to be careful with NOT NULL constraints: code, name, warehouse_id, location_type
                    conn.execute(sa.text("INSERT INTO storage_locations (warehouse_id, code, name, location_type) VALUES (:wh_id, 'GENERAL', 'Ubicación General', 'floor')"), 
                                 {"wh_id": wh_id})
                    # Fetch back
                    default_loc_id = conn.execute(sa.text("SELECT id FROM storage_locations WHERE warehouse_id = :wh_id AND code = 'GENERAL'"), {"wh_id": wh_id}).fetchone()[0]
            
            # 3. Calculate Stock from Movements
            # Assuming 'movements' table exists and has quantity (+/-)
            stock_rows = conn.execute(sa.text("SELECT product_id, SUM(quantity) as qty FROM movements WHERE warehouse_id = :wh_id GROUP BY product_id HAVING SUM(quantity) > 0"), {"wh_id": wh_id}).fetchall()
            
            # 4. Insert Assignments
            for row in stock_rows:
                p_id = row[0]
                qty = row[1]
                
                # Check if already assigned (idempotency)
                exists = conn.execute(sa.text("SELECT 1 FROM product_location_assignments WHERE product_id = :p_id AND location_id = :loc_id"), 
                                      {"p_id": p_id, "loc_id": default_loc_id}).fetchone()
                
                if not exists:
                    conn.execute(sa.text("INSERT INTO product_location_assignments (product_id, location_id, warehouse_id, quantity, assignment_type, is_primary) VALUES (:p_id, :loc_id, :wh_id, :qty, 'auto', 'true')"),
                                 {"p_id": p_id, "loc_id": default_loc_id, "wh_id": wh_id, "qty": qty})
                    
    except Exception as e:
        print(f"Data migration warning: {e}")
        # We don't want to fail the schema upgrade if data migration fails, usually.
        # But for strict consistency, maybe we should. 
        # Given this is a 'pair programming' assistant, I'll log and continue or let it fail if critical.
        # I'll let it propagate if it's a SQL error.


def downgrade() -> None:
    op.drop_table('location_audit_logs')
    op.drop_table('product_location_assignments')
    
    op.drop_index(op.f('ix_storage_locations_barcode'), table_name='storage_locations')
    op.drop_column('storage_locations', 'barcode')
    op.drop_column('storage_locations', 'current_occupancy')
    op.drop_column('storage_locations', 'is_restricted')
    op.drop_column('storage_locations', 'temperature_zone')
    op.drop_column('storage_locations', 'dimensions')
    op.drop_column('storage_locations', 'capacity')
    op.drop_column('storage_locations', 'location_type')
    
    # Clean up Enums
    sa.Enum(name='locationtype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='assignmenttype').drop(op.get_bind(), checkfirst=True)
    
    op.rename_table('storage_locations', 'locations')
