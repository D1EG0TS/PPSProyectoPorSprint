export enum LocationType {
  ZONE = "zone",
  AISLE = "aisle",
  RACK = "rack",
  SHELF = "shelf",
  BIN = "bin",
  PALLET = "pallet",
  FLOOR = "floor"
}

export interface StorageLocation {
  id: number;
  warehouse_id: number;
  parent_location_id?: number | null;
  code: string;
  name: string;
  path?: string;
  location_type: LocationType;
  
  // Coordinate fields
  aisle?: string;
  rack?: string;
  shelf?: string;
  position?: string;
  
  capacity: number;
  current_occupancy: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  temperature_zone?: string;
  is_restricted: boolean;
  barcode?: string;
  children?: StorageLocation[];
}

export interface ProductLocationAssignment {
  id: number;
  product_id: number;
  location_id: number;
  warehouse_id: number;
  quantity: number;
  batch_id?: number;
  assignment_type: string;
  assigned_at: string;
  product?: {
    id: number;
    sku: string;
    name: string;
  };
}

export interface ProductRelocationRequest {
  from_location_id: number;
  to_location_id: number;
  quantity: number;
  reason?: string;
}
