export interface Category {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number };
}

export interface Supplier {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  category?: { id: number; name: string };
  currentStock: number;
  minStockLevel: number;
  unitPrice: number;
  isActive: boolean;
  status: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord {
  id: number;
  serviceCode: string;
  customerId: number;
  customer?: { id: number; name: string };
  serviceType: string;
  status: string;
  serviceDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface POItem {
  id?: number;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId?: number | null;
  supplierName: string;
  supplier?: { id: number; name: string } | null;
  status: string;
  totalAmount: number;
  orderDate: string;
  expectedDate?: string | null;
  notes?: string | null;
  items: POItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id?: number;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: number;
  saleNumber: string;
  customerId: number;
  customer?: { id: number; name: string };
  totalAmount: number;
  saleDate: string;
  status: string;
  notes?: string | null;
  items: SaleItem[];
  createdAt: string;
  updatedAt: string;
}
