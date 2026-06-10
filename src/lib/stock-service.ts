import { prisma } from "@/lib/db";
import type { MovementType } from "@/lib/constants";

export function generateId(prefix: string) {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${ts}${rand}`;
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
