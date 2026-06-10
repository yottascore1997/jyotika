import { prisma } from "@/lib/db";
import { generateId } from "@/lib/stock-service";

export type SetItemInput = {
  serialNumber: string;
  partRole?: string;
  modelNumber?: string;
  make?: string;
  purpose?: string;
  commercialInvoiceNo?: string;
  commercialInvoiceDate?: string;
  awbNumber?: string;
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
  mainSerialNumber: string;
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
  if (!input.mainSerialNumber?.trim()) {
    throw new Error("Set serial number (main) is required");
  }
  if (!input.modelNumber || !input.items?.length) {
    throw new Error("modelNumber and at least one set item are required");
  }

  const mainSerialNumber = input.mainSerialNumber.trim();
  const serials = input.items.map((i) => i.serialNumber.trim()).filter(Boolean);
  if (serials.length !== input.items.length) {
    throw new Error("Every set item must have a serial number");
  }

  if (!serials.includes(mainSerialNumber)) {
    throw new Error("Set serial number must match one of the set item serial numbers (usually Main Unit)");
  }

  const uniqueSerials = new Set(serials);
  if (uniqueSerials.size !== serials.length) {
    throw new Error("Duplicate serial numbers in set items");
  }

  const existingMain = await prisma.stockSet.findUnique({
    where: { mainSerialNumber },
  });
  if (existingMain) {
    throw new Error(`Set serial number ${mainSerialNumber} is already used by set ${existingMain.setId}`);
  }

  const existing = await prisma.stockMaster.findMany({
    where: { serialNumber: { in: serials } },
    select: { serialNumber: true },
  });
  if (existing.length > 0) {
    throw new Error(`Serial number(s) already exist: ${existing.map((e) => e.serialNumber).join(", ")}`);
  }

  const receivedDate = input.receivedDate ? new Date(input.receivedDate) : new Date();

  return prisma.$transaction(async (tx) => {
    const stockSet = await tx.stockSet.create({
      data: {
        setId: generateId("SET"),
        mainSerialNumber,
        modelNumber: input.modelNumber,
        make: input.make || null,
        oemSupplier: input.oemSupplier || "Unknown",
        materialType: input.materialType || "Equipment",
        category: input.category || "Other",
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
        commercialInvoiceNo: input.commercialInvoiceNo || null,
        commercialInvoiceDate: input.commercialInvoiceDate
          ? new Date(input.commercialInvoiceDate)
          : null,
        awbNumber: input.awbNumber || null,
        workingCondition: input.workingCondition || null,
      },
    });

    const items = [];
    for (const item of input.items) {
      const itemReceivedDate = item.receivedDate ? new Date(item.receivedDate) : receivedDate;
      const itemInvoiceDate = item.commercialInvoiceDate
        ? new Date(item.commercialInvoiceDate)
        : input.commercialInvoiceDate
          ? new Date(input.commercialInvoiceDate)
          : null;

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
          category: item.category || input.category || "Other",
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
          commercialInvoiceNo: item.commercialInvoiceNo ?? input.commercialInvoiceNo ?? null,
          commercialInvoiceDate: itemInvoiceDate,
          awbNumber: item.awbNumber ?? input.awbNumber ?? null,
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
