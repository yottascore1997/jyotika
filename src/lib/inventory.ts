export type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock" | "Inactive";

export function getInventoryStatus(
  currentStock: number,
  minStockLevel: number,
  isActive: boolean
): InventoryStatus {
  if (!isActive) return "Inactive";
  if (currentStock === 0) return "Out of Stock";
  if (currentStock <= minStockLevel) return "Low Stock";
  return "In Stock";
}
