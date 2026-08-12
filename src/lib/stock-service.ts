import { prisma } from "@/lib/db";
import type { MovementType } from "@/lib/constants";

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0] | typeof prisma;

export function generateId(prefix: string) {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${ts}${rand}`;
}

/** Sequential GRN like GRN-01, GRN-02… (only counts numeric suffixes). */
export async function generateGRNNumber(db: DbClient = prisma) {
  const receipts = await db.materialReceipt.findMany({
    where: { grnNumber: { startsWith: "GRN-" } },
    select: { grnNumber: true },
  });

  let max = 0;
  for (const receipt of receipts) {
    const match = /^GRN-(\d+)$/.exec(receipt.grnNumber);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }

  return `GRN-${String(max + 1).padStart(2, "0")}`;
}

export async function createMaterialReceiptForStock(
  db: DbClient,
  stock: {
    id: number;
    serialNumber: string;
    modelNumber: string;
    oemSupplier: string;
    materialType: string;
    description?: string | null;
    receivedDate: Date;
    poNumber?: string | null;
    remarks?: string | null;
    quantity: number;
  },
  opts?: { receivedBy?: string; grnNumber?: string; remarks?: string }
) {
  const grnNumber = opts?.grnNumber || (await generateGRNNumber(db));

  return db.materialReceipt.create({
    data: {
      grnNumber,
      receivedDate: stock.receivedDate,
      supplierOem: stock.oemSupplier || "Unknown",
      materialDescription: stock.description || stock.modelNumber,
      modelNumber: stock.modelNumber,
      serialNumber: stock.serialNumber,
      quantity: stock.quantity || 1,
      materialType: stock.materialType,
      receivedBy: opts?.receivedBy || "Admin",
      poNumber: stock.poNumber || null,
      remarks: opts?.remarks ?? stock.remarks ?? null,
      stockMasterId: stock.id,
    },
  });
}

export async function logMovement(params: {
  stockMasterId: number;
  serialNumber: string;
  fromLocation: string;
  toLocation: string;
  movementType: MovementType | string;
  user?: string;
  remarks?: string;
  date?: Date;
}) {
  return prisma.stockMovement.create({
    data: {
      movementId: generateId("MOV"),
      stockMasterId: params.stockMasterId,
      serialNumber: params.serialNumber,
      fromLocation: params.fromLocation,
      toLocation: params.toLocation,
      movementType: params.movementType,
      user: params.user || "Admin",
      remarks: params.remarks || null,
      date: params.date || new Date(),
    },
  });
}

export async function updateStock(params: {
  stockMasterId: number;
  serialNumber: string;
  currentStatus: string;
  currentHolder: string;
  location?: string;
  fromLocation: string;
  toLocation: string;
  movementType: MovementType | string;
  remarks?: string;
}) {
  const stock = await prisma.stockMaster.update({
    where: { id: params.stockMasterId },
    data: {
      currentStatus: params.currentStatus,
      currentHolder: params.currentHolder,
      ...(params.location ? { location: params.location } : {}),
    },
  });

  await logMovement({
    stockMasterId: params.stockMasterId,
    serialNumber: params.serialNumber,
    fromLocation: params.fromLocation,
    toLocation: params.toLocation,
    movementType: params.movementType,
    remarks: params.remarks,
  });

  return stock;
}

export async function getStockBySerial(serialNumber: string) {
  return prisma.stockMaster.findUnique({
    where: { serialNumber },
    include: {
      movements: { orderBy: { date: "asc" } },
      receipt: true,
      issues: { orderBy: { issueDate: "desc" } },
      demos: { orderBy: { issueDate: "desc" } },
      handovers: { orderBy: { handoverDate: "desc" } },
      repairs: { orderBy: { receivedDate: "desc" } },
      oemReturns: { orderBy: { returnDate: "desc" } },
      sales: { orderBy: { saleDate: "desc" } },
      poAllocations: {
        include: { poMaster: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export function calcDaysOut(issueDate: Date, actualReturnDate?: Date | null) {
  const end = actualReturnDate || new Date();
  return Math.max(0, Math.ceil((end.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24)));
}

export function isOverdue(expectedReturnDate?: Date | null, actualReturnDate?: Date | null) {
  if (!expectedReturnDate || actualReturnDate) return false;
  return new Date() > expectedReturnDate;
}
