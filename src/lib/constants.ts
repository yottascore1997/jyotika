export const STOCK_STATUSES = [
  "Available",
  "Reserved",
  "Issued",
  "Demo",
  "Sample",
  "Repair",
  "Repaired – Awaiting Dispatch",
  "DOA (Dead on Arrival)",
  "Sold",
  "Returned To OEM",
  "Customer Trial",
  "Calibration",
  "Scrapped",
] as const;

/** Status options when adding inward stock (Add Stock form). */
export const INWARD_STOCK_STATUSES = [
  { value: "Available", description: "In stock and ready to use." },
  { value: "Reserved", description: "Kept aside for a specific purpose." },
  { value: "Demo", description: "Used for demonstrations." },
  { value: "Sample", description: "Sample unit." },
  { value: "Customer Trial", description: "Sent to a customer for evaluation." },
  {
    value: "Repaired – Awaiting Dispatch",
    description:
      "Repaired material received back and waiting to be dispatched to the customer.",
  },
] as const;

/** Unit types for Add Stock (single item). */
export const STOCK_UNIT_TYPES = [
  { value: "Main Unit", label: "Monitor", hint: "Main display / base unit" },
  { value: "Probe", label: "Probe", hint: "Probe / camera unit" },
  { value: "Accessory", label: "Accessory", hint: "Cable, case, or accessory" },
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
  "Service",
  "Service Return",
] as const;

export const DEMO_STATUSES = ["Active", "Returned", "Overdue"] as const;
export const REPAIR_STATUSES = ["Received", "Under Repair", "Repaired", "Returned", "Closed"] as const;

export const SERVICE_TYPES = [
  "General Service",
  "Installation",
  "Maintenance",
  "Calibration",
  "Inspection",
  "AMC Visit",
] as const;

export const SERVICE_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"] as const;
export const OEM_RETURN_STATUSES = ["Pending", "Returned", "Closed"] as const;

export const MATERIAL_TYPES = [
  "Equipment",
  "Spare Part",
  "Demo Unit",
  "Accessory",
  "Consumable",
] as const;

export const CATEGORIES = [
  "Remote Visual Inspection (RVI) - Equipment",
  "Non Destructive Testing - Equipment",
  "Accessories",
] as const;

/** Deduped accessories checklist for Add Set (Jyotika lists merged). */
export const ACCESSORIES_CHECKLIST = [
  "Base Unit",
  "Probe Unit",
  "Trolley Case",
  "Rigid Sleeve",
  "Lithium-ion Batteries / Swappable Battery",
  "Power Adapter",
  "Charger Set (USB Type-C Power Adapter)",
  "USB Charging Cable (For Power Bank)",
  "USB Type-C Cable",
  "HDMI Cable",
  "HDMI Type-D Cable",
  "Mini-HDMI Cable",
  "EMI Core ×4 (Detachable for USB or HDMI Cable Connector Ends)",
  "Neck Strap",
  "Shoulder Strap",
  "Hand Strap",
  "Sun Visor",
  "Insulation Cap",
  "Probe Clamp Plug",
  "Monopod",
  "Calibration Block",
  "Side View / Dual View Mirror Adapters",
  "18 mm Metal Centering Device",
  "38 mm Metal Centering Device",
  "65 mm Metal Centering Device",
  "Memory Card (64GB Micro SD)",
  "Cleaning Kit",
] as const;

export const WARRANTY_STATUSES = ["Active", "Expired", "Not Applicable"] as const;

export const INWARD_PURPOSES = [
  "New Material",
  "Replacement",
  "Repair Return",
  "Demo Return",
  "Buyback",
  "Refurbished",
] as const;

export const QUANTITY_UNITS = ["set", "pcs", "unit", "nos"] as const;

export const WORKING_CONDITIONS = ["Working", "Non-Working", "Under Inspection"] as const;

export const SET_PART_ROLES = [
  "Main Unit",
  "Probe",
  "Accessory",
  "Cable",
  "Controller",
  "Other",
] as const;

export const PO_ORDER_TYPES = [
  "New Supply",
  "Repair",
  "Buyback",
  "Replacement",
] as const;

export const PO_STATUSES = ["Pending", "Completed"] as const;

export const PO_STOCK_TYPES = ["New Stock", "Demo Stock", "Refurbished", "Buyback"] as const;

export const PO_ALLOCATION_STATUSES = ["Reserved", "Sold"] as const;

export const TENDER_STATUSES = [
  "Tender Win",
  "Tender Filled Up",
  "Technically Disqualified",
  "Commercially Disqualified",
  "Tender Canceled",
] as const;

export const YES_NO_OPTIONS = ["Yes", "No"] as const;
export const TENDER_TYPES = ["Standard", "Open"] as const;

export type StockStatus = (typeof STOCK_STATUSES)[number];
export type StockHolder = (typeof STOCK_HOLDERS)[number];
export type MovementType = (typeof MOVEMENT_TYPES)[number];
