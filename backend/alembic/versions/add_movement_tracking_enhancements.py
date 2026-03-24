"""add_movement_tracking_enhancements

Revision ID: add_movement_tracking_enhancements
Revises: f550b5587fc9
Create Date: 2026-03-23 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = 'add_movement_tracking_enhancements'
down_revision: Union[str, Sequence[str], None] = 'f550b5587fc9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table):
    """Check if table exists."""
    conn = op.get_bind()
    inspector = inspect(conn)
    return table in inspector.get_table_names()


def column_exists(table, column):
    """Check if column exists in table."""
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns(table)]
    return column in columns


def upgrade() -> None:
    # Create new tables only if they don't exist
    if not table_exists('addresses'):
        op.create_table('addresses',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('address_type', sa.Enum('SHIPPING', 'RECEIVING', 'WAREHOUSE', 'PROJECT', 'SUPPLIER', 'CUSTOMER', 'OTHER', name='addresstype'), nullable=False),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('alias', sa.String(length=100), nullable=True),
            sa.Column('street', sa.String(length=255), nullable=True),
            sa.Column('exterior_number', sa.String(length=20), nullable=True),
            sa.Column('interior_number', sa.String(length=20), nullable=True),
            sa.Column('neighborhood', sa.String(length=100), nullable=True),
            sa.Column('city', sa.String(length=100), nullable=True),
            sa.Column('municipality', sa.String(length=100), nullable=True),
            sa.Column('state', sa.String(length=100), nullable=True),
            sa.Column('country', sa.String(length=100), nullable=False),
            sa.Column('postal_code', sa.String(length=20), nullable=True),
            sa.Column('coordinates', sa.JSON(), nullable=True),
            sa.Column('reference', sa.Text(), nullable=True),
            sa.Column('instructions', sa.Text(), nullable=True),
            sa.Column('contact_name', sa.String(length=200), nullable=True),
            sa.Column('contact_phone', sa.String(length=50), nullable=True),
            sa.Column('contact_email', sa.String(length=100), nullable=True),
            sa.Column('is_default', sa.Boolean(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_by', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_addresses_id'), 'addresses', ['id'], unique=False)

    if not table_exists('transport_providers'):
        op.create_table('transport_providers',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('code', sa.String(length=50), nullable=False),
            sa.Column('carrier_type', sa.String(length=50), nullable=True),
            sa.Column('contact_name', sa.String(length=200), nullable=True),
            sa.Column('contact_phone', sa.String(length=50), nullable=True),
            sa.Column('contact_email', sa.String(length=100), nullable=True),
            sa.Column('website', sa.String(length=255), nullable=True),
            sa.Column('tracking_url_template', sa.String(length=500), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_transport_providers_id'), 'transport_providers', ['id'], unique=False)
        op.create_index(op.f('ix_transport_providers_code'), 'transport_providers', ['code'], unique=True)

    if not table_exists('movement_tracking_events'):
        op.create_table('movement_tracking_events',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('request_id', sa.Integer(), nullable=False),
            sa.Column('event_type', sa.Enum('CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IN_PREPARATION', 'PICKED', 'PACKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED', 'RECEIVED', 'CANCELLED', 'ON_HOLD', 'QC_INSPECTION', 'QC_PASSED', 'QC_FAILED', 'RETURNED', name='trackingeventtype'), nullable=False),
            sa.Column('event_description', sa.String(length=500), nullable=True),
            sa.Column('location_type', sa.Enum('ORIGIN', 'DESTINATION', 'WAREHOUSE', 'TRANSIT', 'QC', 'CUSTOM', name='trackinglocationtype'), nullable=True),
            sa.Column('location_name', sa.String(length=200), nullable=True),
            sa.Column('location_address', sa.String(length=500), nullable=True),
            sa.Column('latitude', sa.Float(), nullable=True),
            sa.Column('longitude', sa.Float(), nullable=True),
            sa.Column('previous_status', sa.String(length=50), nullable=True),
            sa.Column('new_status', sa.String(length=50), nullable=True),
            sa.Column('performed_by', sa.Integer(), nullable=False),
            sa.Column('performed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('attachments', sa.JSON(), nullable=True),
            sa.Column('extra_data', sa.JSON(), nullable=True),
            sa.ForeignKeyConstraint(['request_id'], ['movement_requests.id'], ),
            sa.ForeignKeyConstraint(['performed_by'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_movement_tracking_events_id'), 'movement_tracking_events', ['id'], unique=False)
        op.create_index(op.f('ix_movement_tracking_events_request_id'), 'movement_tracking_events', ['request_id'], unique=False)

    if not table_exists('movement_documents'):
        op.create_table('movement_documents',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('request_id', sa.Integer(), nullable=False),
            sa.Column('item_id', sa.Integer(), nullable=True),
            sa.Column('document_type', sa.Enum('DELIVERY_NOTE', 'INVOICE', 'RECEIPT', 'PACKING_LIST', 'BILL_OF_LADING', 'QUALITY_CERTIFICATE', 'PHOTO', 'SIGNATURE', 'DAMAGE_REPORT', 'RETURN_AUTHORIZATION', 'CUSTOMS_DECLARATION', 'OTHER', name='documenttype'), nullable=False),
            sa.Column('file_name', sa.String(length=255), nullable=False),
            sa.Column('file_path', sa.String(length=500), nullable=False),
            sa.Column('file_url', sa.String(length=1000), nullable=True),
            sa.Column('file_size', sa.Integer(), nullable=True),
            sa.Column('mime_type', sa.String(length=100), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('uploaded_by', sa.Integer(), nullable=False),
            sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('verified', sa.Boolean(), nullable=True),
            sa.Column('verified_by', sa.Integer(), nullable=True),
            sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['request_id'], ['movement_requests.id'], ),
            sa.ForeignKeyConstraint(['item_id'], ['movement_request_items.id'], ),
            sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['verified_by'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_movement_documents_id'), 'movement_documents', ['id'], unique=False)
        op.create_index(op.f('ix_movement_documents_request_id'), 'movement_documents', ['request_id'], unique=False)

    if not table_exists('movement_signatures'):
        op.create_table('movement_signatures',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('request_id', sa.Integer(), nullable=False),
            sa.Column('signature_type', sa.String(length=50), nullable=False),
            sa.Column('signer_name', sa.String(length=200), nullable=False),
            sa.Column('signer_role', sa.String(length=100), nullable=True),
            sa.Column('signer_document', sa.String(length=50), nullable=True),
            sa.Column('signature_data', sa.Text(), nullable=False),
            sa.Column('signature_image_url', sa.String(length=500), nullable=True),
            sa.Column('latitude', sa.Float(), nullable=True),
            sa.Column('longitude', sa.Float(), nullable=True),
            sa.Column('signed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('signed_by', sa.Integer(), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(['request_id'], ['movement_requests.id'], ),
            sa.ForeignKeyConstraint(['signed_by'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_movement_signatures_id'), 'movement_signatures', ['id'], unique=False)

    if not table_exists('movement_transport_info'):
        op.create_table('movement_transport_info',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('request_id', sa.Integer(), nullable=False),
            sa.Column('provider_id', sa.Integer(), nullable=True),
            sa.Column('tracking_number', sa.String(length=100), nullable=True),
            sa.Column('vehicle_plate', sa.String(length=50), nullable=True),
            sa.Column('driver_name', sa.String(length=200), nullable=True),
            sa.Column('driver_phone', sa.String(length=50), nullable=True),
            sa.Column('driver_license', sa.String(length=50), nullable=True),
            sa.Column('departure_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('arrival_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('estimated_arrival', sa.DateTime(timezone=True), nullable=True),
            sa.Column('shipping_cost', sa.Float(), nullable=True),
            sa.Column('currency', sa.String(length=3), nullable=True),
            sa.Column('handling_instructions', sa.Text(), nullable=True),
            sa.Column('special_requirements', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['request_id'], ['movement_requests.id'], ),
            sa.ForeignKeyConstraint(['provider_id'], ['transport_providers.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_movement_transport_info_id'), 'movement_transport_info', ['id'], unique=False)

    # Add columns to movement_requests
    columns_mr = {
        'request_number': sa.String(length=50),
        'source_address_id': sa.Integer(),
        'destination_address_id': sa.Integer(),
        'project_code': sa.String(length=50),
        'priority': sa.String(length=20),
        'department': sa.String(length=100),
        'cost_center': sa.String(length=50),
        'transport_method': sa.String(length=50),
        'transport_provider': sa.String(length=100),
        'transport_tracking': sa.String(length=100),
        'handling_instructions': sa.Text(),
        'is_external': sa.Boolean(),
        'external_reference': sa.String(length=100),
        'received_by': sa.Integer(),
        'delivered_by': sa.Integer(),
        'expected_date': sa.DateTime(timezone=True),
        'actual_date': sa.DateTime(timezone=True),
        'approval_notes': sa.Text(),
        'container_code': sa.String(length=100),
        'project_name': sa.String(length=200),
        'movement_purpose': sa.String(length=50),
        'operator_notes': sa.Text(),
    }
    
    for col_name, col_type in columns_mr.items():
        if not column_exists('movement_requests', col_name):
            op.add_column('movement_requests', sa.Column(col_name, col_type, nullable=True))

    # Create indexes for movement_requests
    if not column_exists('movement_requests', 'request_number'):
        pass  # Column check above
    try:
        op.create_index(op.f('ix_movement_requests_request_number'), 'movement_requests', ['request_number'], unique=True)
    except:
        pass
    try:
        op.create_index(op.f('ix_movement_requests_source_address_id'), 'movement_requests', ['source_address_id'], unique=False)
    except:
        pass
    try:
        op.create_index(op.f('ix_movement_requests_destination_address_id'), 'movement_requests', ['destination_address_id'], unique=False)
    except:
        pass

    # Add columns to movement_request_items
    columns_mri = {
        'quantity_delivered': sa.Integer(),
        'source_location_id': sa.Integer(),
        'destination_location_id': sa.Integer(),
        'lot_number': sa.String(length=100),
        'serial_number': sa.String(length=100),
        'container_position': sa.String(length=50),
        'priority': sa.String(length=20),
        'manufacturing_date': sa.Date(),
        'expiry_date': sa.Date(),
        'storage_conditions': sa.String(length=50),
        'quality_status': sa.String(length=50),
        'unit_cost': sa.Float(),
        'status': sa.String(length=50),
    }
    
    for col_name, col_type in columns_mri.items():
        if not column_exists('movement_request_items', col_name):
            op.add_column('movement_request_items', sa.Column(col_name, col_type, nullable=True))

    # Add columns to movements
    columns_mv = {
        'location_id': sa.Integer(),
        'lot_number': sa.String(length=100),
        'serial_number': sa.String(length=100),
    }
    
    for col_name, col_type in columns_mv.items():
        if not column_exists('movements', col_name):
            op.add_column('movements', sa.Column(col_name, col_type, nullable=True))

    try:
        op.create_index(op.f('ix_movements_location_id'), 'movements', ['location_id'], unique=False)
    except:
        pass


def downgrade() -> None:
    try:
        op.drop_index(op.f('ix_movements_location_id'), table_name='movements')
    except:
        pass
    
    if column_exists('movements', 'serial_number'):
        op.drop_column('movements', 'serial_number')
    if column_exists('movements', 'lot_number'):
        op.drop_column('movements', 'lot_number')
    if column_exists('movements', 'location_id'):
        op.drop_column('movements', 'location_id')

    columns_items = ['status', 'unit_cost', 'quality_status', 'storage_conditions', 
                     'expiry_date', 'manufacturing_date', 'priority', 'container_position',
                     'serial_number', 'lot_number', 'destination_location_id', 
                     'source_location_id', 'quantity_delivered']
    for col in columns_items:
        if column_exists('movement_request_items', col):
            op.drop_column('movement_request_items', col)

    try:
        op.drop_index(op.f('ix_movement_requests_destination_address_id'), table_name='movement_requests')
    except:
        pass
    try:
        op.drop_index(op.f('ix_movement_requests_source_address_id'), table_name='movement_requests')
    except:
        pass
    try:
        op.drop_index(op.f('ix_movement_requests_request_number'), table_name='movement_requests')
    except:
        pass

    columns_requests = ['operator_notes', 'movement_purpose', 'project_name', 'container_code',
                       'approval_notes', 'actual_date', 'expected_date', 'delivered_by',
                       'received_by', 'external_reference', 'is_external', 'handling_instructions',
                       'transport_tracking', 'transport_provider', 'transport_method',
                       'cost_center', 'department', 'priority', 'project_code',
                       'destination_address_id', 'source_address_id', 'request_number']
    for col in columns_requests:
        if column_exists('movement_requests', col):
            op.drop_column('movement_requests', col)

    if table_exists('movement_transport_info'):
        op.drop_table('movement_transport_info')
    if table_exists('movement_signatures'):
        op.drop_table('movement_signatures')
    if table_exists('movement_documents'):
        op.drop_table('movement_documents')
    try:
        op.drop_index(op.f('ix_movement_tracking_events_request_id'), table_name='movement_tracking_events')
    except:
        pass
    try:
        op.drop_index(op.f('ix_movement_tracking_events_id'), table_name='movement_tracking_events')
    except:
        pass
    if table_exists('movement_tracking_events'):
        op.drop_table('movement_tracking_events')
    try:
        op.drop_index(op.f('ix_transport_providers_code'), table_name='transport_providers')
    except:
        pass
    try:
        op.drop_index(op.f('ix_transport_providers_id'), table_name='transport_providers')
    except:
        pass
    if table_exists('transport_providers'):
        op.drop_table('transport_providers')
    try:
        op.drop_index(op.f('ix_addresses_id'), table_name='addresses')
    except:
        pass
    if table_exists('addresses'):
        op.drop_table('addresses')
