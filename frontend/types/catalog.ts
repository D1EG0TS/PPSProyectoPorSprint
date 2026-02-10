export interface CatalogCategory {
  id: number;
  name: string;
}

export interface CatalogUnit {
  id: number;
  name: string;
  abbreviation: string;
}

export interface CatalogLocation {
  warehouse_name: string;
  location_code: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  position?: string;
  quantity: number;
  batch_number?: string;
}

export interface StockByWarehouse {
  warehouse_id: number;
  warehouse_name: string;
  quantity: number;
}

export interface PublicCatalogItem {
  id: number;
  sku: string;
  name: string;
  description?: string;
  category?: CatalogCategory;
  unit?: CatalogUnit;
  barcode?: string;
  brand?: string;
  model?: string;
  image_url?: string;
}

export interface OperationalCatalogItem extends PublicCatalogItem {
  total_stock: number;
  available_stock: number;
  can_add_to_request: boolean;
}

export interface InternalCatalogItem extends OperationalCatalogItem {
  stock_by_warehouse: StockByWarehouse[];
  min_stock: number;
  needs_reorder: boolean;
}

export interface AdminCatalogItem extends InternalCatalogItem {
  locations: CatalogLocation[];
  cost: number;
  price: number;
  last_movement_date?: string;
  supplier_info?: string;
}

export type CatalogItem = AdminCatalogItem | InternalCatalogItem | OperationalCatalogItem | PublicCatalogItem;

export interface CatalogPermissions {
  can_see_stock: boolean;
  can_see_locations: boolean;
  can_see_costs: boolean;
  can_add_to_request: boolean;
  can_export_data: boolean;
}
