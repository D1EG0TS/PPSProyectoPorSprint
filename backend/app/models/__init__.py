from app.database import Base
from app.models.user import User, Role
from app.models.inventory_refs import Condition, Unit, Category
from app.models.session import Session
from app.models.product import Product, ProductBatch
from app.models.warehouse import Warehouse
from app.models.location_models import StorageLocation
from app.models.product_location_models import ProductLocationAssignment
from app.models.location_audit_models import LocationAuditLog
from app.models.movement import (
    MovementRequest, MovementRequestItem, Movement, MovementType, MovementStatus,
    MovementPurpose, MovementPriority, ItemPriority, QualityStatus, StorageCondition
)
from app.models.tracking_models import (
    MovementTrackingEvent, TrackingEventType,
    MovementDocument, DocumentType
)
from app.models.tool import Tool, ToolHistory, ToolStatus
from app.models.epp import EPP, EPPInspection, EPPStatus
from app.models.system import SystemConfig
from app.models.vehicle import Vehicle, VehicleStatus, VehicleDocument, VehicleMaintenance
from app.models.vehicle_maintenance import VehicleMaintenanceType, VehicleMaintenanceRecord, VehicleMaintenanceAttachment, VehicleMaintenancePart
from app.models.ledger import LedgerEntry, LedgerEntryType
from app.models.integrated_request import (
    IntegratedRequest, RequestItem, RequestTool, RequestEPP, RequestVehicle, RequestTracking
)
from app.models.tracking import ItemTracking, Penalization, PenalizationReason, PenalizationStatus
from app.models.purchase import PurchaseAlert
from app.models.notification import Notification, NotificationType
from app.models.warehouse_layout import WarehouseLayout, LayoutCell, CellType, OccupancyLevel
from app.models.label import LabelTemplate, LabelType, LabelSize
from app.models.assets import (
    AssetCategory, Asset, AssetAttribute, AssetDepreciation, 
    AssetMaintenance, AssetCalibration, AssetAssignment, AssetAuditLog,
    AssetType, DepreciationMethod, AssetStatus, AssetCondition, 
    AttributeType, MaintenanceType, MaintenanceStatus, CalibrationStatus, 
    AssetAction, AssignmentStatus
)
from app.models.supplier import Supplier, SupplierStatus, SupplierCategory
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, PurchaseOrderPriority
from app.models.notification_preferences import UserNotificationPreference, NotificationChannel, NotificationEvent
