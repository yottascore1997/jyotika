import { prisma } from "@/lib/db";
import { generateId } from "@/lib/stock-service";

export type SetItemInput = {
  serialNumber: string;
  partRole?: string;
  modelNumber?: string;
  make?: string;
  purpose?: string;
  workingCondition?: string;
  currentStatus?: string;
  oemSupplier?: string;
  materialType?: string;
  category?: string;
  location?: string;
  purchaseCost?: number;
  remarks?: string;
  quantity?: number;
  receivedDate?: string;
};

export type CreateSetInput = {
  mainSerialNumber?: string;
  modelNumber: string;
  make?: string;
  oemSupplier?: string;
  materialType?: string;
  category?: string;
  receivedDate?: string;
  warrantyStatus?: string;
  poNumber?: string;
  purchaseCost?: number;
  currentStatus?: string;
  currentHolder?: string;
  location?: string;
  remarks?: string;
  purpose?: string;
  commercialInvoiceNo?: string;
  commercialInvoiceDate?: string;
  awbNumber?: string;
  workingCondition?: string;
  items: SetItemInput[];
};

export async function createStockSet(input: CreateSetInput) {
  if (!input.modelNumber || !input.items?.length) {
    throw new Error("modelNumber and at least one set item are required");
  }

  const serials = input.items.map((i) => i.serialNumber.trim()).filter(Boolean);
  if (serials.length !== input.items.length) {
    throw new Error("Every set item must have a serial number");
  }

  const uniqueSerials = new Set(serials);
  if (uniqueSerials.size !== serials.length) {
    throw new Error("Duplicate serial numbers in set items");
  }

  // Optional display reference only — prefer Main Unit item serial if present
  const mainUnitItem = input.items.find((i) => (i.partRole || "").toLowerCase() === "main unit");
  const mainSerialNumber =
    mainUnitItem?.serialNumber.trim() ||
    input.mainSerialNumber?.trim() ||
    null;

  if (mainSerialNumber) {
    const existingMain = await prisma.stockSet.findUnique({
      where: { mainSerialNumber },
    });
    if (existingMain) {
      throw new Error(`Main unit serial ${mainSerialNumber} is already used by set ${existingMain.setId}`);
    }
  }

  const existing = await prisma.stockMaster.findMany({
    where: { serialNumber: { in: serials } },
    select: { serialNumber: true },
  });
  if (existing.length > 0) {
    throw new Error(`Serial number(s) already exist: ${existing.map((e) => e.serialNumber).join(", ")}`);
  }

  const receivedDate = input.receivedDate ? new Date(input.receivedDate) : new Date();
  const setInvoiceNo = input.commercialInvoiceNo || null;
  const setInvoiceDate = input.commercialInvoiceDate ? new Date(input.commercialInvoiceDate) : null;
  const setAwb = input.awbNumber || null;

  return prisma.$transaction(async (tx) => {
    const stockSet = await tx.stockSet.create({
      data: {
        setId: generateId("SET"),
        mainSerialNumber,
        modelNumber: input.modelNumber,
        make: input.make || null,
        oemSupplier: input.oemSupplier || "Unknown",
        materialType: input.materialType || "Equipment",
        category: input.category || "Others",
        receivedDate,
        warrantyStatus: input.warrantyStatus || "Active",
        poNumber: input.poNumber || null,
        purchaseCost: Number(input.purchaseCost) || 0,
        currentStatus: input.currentStatus || "Available",
        currentHolder: input.currentHolder || "Store",
        location: input.location || "Main Store",
        remarks: input.remarks || null,
        quantity: 1,
        quantityUnit: "set",
        purpose: input.purpose || null,
        commercialInvoiceNo: setInvoiceNo,
        commercialInvoiceDate: setInvoiceDate,
        awbNumber: setAwb,
        workingCondition: input.workingCondition || null,
      },
    });

    const items = [];
    for (const item of input.items) {
      const itemReceivedDate = item.receivedDate ? new Date(item.receivedDate) : receivedDate;

      const created = await tx.stockMaster.create({
        data: {
          stockId: generateId("STK"),
          stockSetId: stockSet.id,
          partRole: item.partRole || "Main Unit",
          materialType: item.materialType || input.materialType || "Equipment",
          oemSupplier: item.oemSupplier || input.oemSupplier || "Unknown",
          make: item.make ?? input.make ?? null,
          modelNumber: item.modelNumber || input.modelNumber,
          serialNumber: item.serialNumber.trim(),
          category: item.category || input.category || "Others",
          receivedDate: itemReceivedDate,
          warrantyStatus: input.warrantyStatus || "Active",
          poNumber: input.poNumber || null,
          purchaseCost: Number(item.purchaseCost) || 0,
          currentStatus: item.currentStatus || input.currentStatus || "Available",
          currentHolder: input.currentHolder || "Store",
          location: item.location || input.location || "Main Store",
          remarks: item.remarks ?? input.remarks ?? null,
          quantity: Number(item.quantity) || 1,
          quantityUnit: "pcs",
          purpose: item.purpose ?? input.purpose ?? null,
          // Invoice / AWB always from set level (same for all items)
          commercialInvoiceNo: setInvoiceNo,
          commercialInvoiceDate: setInvoiceDate,
          awbNumber: setAwb,
          workingCondition: item.workingCondition ?? input.workingCondition ?? null,
        },
      });

      await tx.stockMovement.create({
        data: {
          movementId: generateId("MOV"),
          stockMasterId: created.id,
          serialNumber: created.serialNumber,
          fromLocation: "External",
          toLocation: created.location,
          movementType: "Receipt",
          user: "Admin",
          remarks: `Set ${stockSet.setId} — ${item.partRole || "Item"}`,
          date: receivedDate,
        },
      });

      items.push(created);
    }

    return { stockSet, items };
  });
}
