export const STOCK_STATUSES = [
  "Available",
  "Reserved",
  "Issued",
  "Demo",
  "Repair",
  "Sold",
  "Returned To OEM",
  "Customer Trial",
  "Calibration",
  "Scrapped",
] as const;

export const STOCK_HOLDERS = [
  "Store",
  "Sales Person",
  "Customer",
  "OEM",
  "Service Department",
] as const;

export const ISSUE_PURPOSES = [
  "Demo",
  "Customer Trial",
  "Exhibition",
  "Service Support",
  "Loaner Unit",
  "Sale",
  "OEM Return",
  "Calibration",
  "Internal Testing",
] as const;

export const MOVEMENT_TYPES = [
  "Receipt",
  "Issue",
  "Return",
  "Demo Issue",
  "Demo Return",
  "Customer Handover",
  "Customer Return",
  "Repair Receipt",
  "Repair Return",
  "Sale",
  "OEM Return",
  "PO Reservation",
  "PO Release",
] as const;

export const DEMO_STATUSES = ["Active", "Returned", "Overdue"] as const;
export const REPAIR_STATUSES = ["Received", "Under Repair", "Repaired", "Returned", "Closed"] as const;
export const OEM_RETURN_STATUSES = ["Pending", "Returned", "Closed"] as const;

export const MATERIAL_TYPES = [
  "Equipment",
  "Spare Part",
  "Demo Unit",
  "Accessory",
  "Consumable",
] as const;

export const CATEGORIES = [
  "Measuring Instrument",
  "Control System",
  "Sensor",
  "Actuator",
  "Power Supply",
  "Other",
] as const;

export const WARRANTY_STATUSES = ["Active", "Expired", "Not Applicable"] as const;

export const PO_ORDER_TYPES = [
  "New Supply",
  "Repair",
  "Buyback",
  "Replacement",
] as const;

export const PO_STATUSES = ["PO", "PI", "Ready", "Dispatch", "Closed", "Cancelled"] as const;

export const PO_STOCK_TYPES = ["New Stock", "Demo Stock", "Refurbished", "Buyback"] as const;

export const PO_ALLOCATION_STATUSES = ["Reserved", "Sold"] as const;

export const TENDER_STATUSES = [
  "Tender Win",
  "Technically Disqualified",
  "Commercially Disqualified",
  "Tender Canceled",
] as const;

export type StockStatus = (typeof STOCK_STATUSES)[number];
export type StockHolder = (typeof STOCK_HOLDERS)[number];
export type MovementType = (typeof MOVEMENT_TYPES)[number];
