import { prisma, executeWithRetry } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { generateId } from "@/lib/stock-service";

/** Remote MySQL (e.g. Railway) needs a longer interactive transaction window. */
const TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

export async function generatePOId() {
  return nextPOId(prisma);
}

async function nextPOId(db: TxClient | typeof prisma) {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `PO-${year}-`;
  const latest = await db.pOMaster.findFirst({
    where: { poId: { startsWith: prefix } },
    orderBy: { id: "desc" },
  });

  let seq = 1;
  if (latest) {
    const parts = latest.poId.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(3, "0")}`;
}

function isDuplicatePoIdError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    String(error.meta?.target || "").includes("poId")
  );
}

export async function allocateSerial(params: {
  poMasterId: number;
  serialNumber: string;
}) {
  return executeWithRetry(() => allocateSerialImpl(params));
}

async function allocateSerialImpl(params: {
  poMasterId: number;
  serialNumber: string;
}) {
  const po = await prisma.pOMaster.findUnique({ where: { id: params.poMasterId } });
  if (!po) throw new Error("PO not found");
  if (po.status === "Completed") {
    throw new Error(`Cannot allocate serials on ${po.status} PO`);
  }

  const stock = await prisma.stockMaster.findUnique({
    where: { serialNumber: params.serialNumber },
  });
  if (!stock) throw new Error(`Serial ${params.serialNumber} not found in stock`);
  if (stock.currentStatus !== "Available") {
    throw new Error(`Serial ${params.serialNumber} is not available (current: ${stock.currentStatus})`);
  }

  const existing = await prisma.pOSerialAllocation.findFirst({
    where: { serialNumber: params.serialNumber, status: "Reserved" },
  });
  if (existing) throw new Error(`Serial ${params.serialNumber} is already reserved on another PO`);

  return prisma.$transaction(async (tx) => {
    const allocation = await reserveSerialInTx(tx, po, stock);
    await syncPOMetrics(tx, po.id);
    return allocation;
  }, TX_OPTIONS);
}

async function syncPOMetrics(tx: TxClient, poMasterId: number) {
  const po = await tx.pOMaster.findUnique({ where: { id: poMasterId } });
  if (!po) return;

  const allocations = await tx.pOSerialAllocation.findMany({ where: { poMasterId } });
  const models = Array.from(new Set(allocations.map((a) => a.model)));
  const quantityOrdered = allocations.length;

  await tx.pOMaster.update({
    where: { id: poMasterId },
    data: {
      quantityOrdered,
      itemDescription: models.join(", ") || po.itemDescription,
      totalPoValue: quantityOrdered * Number(po.unitValue),
    },
  });
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function reserveSerialInTx(
  tx: TxClient,
  po: { id: number; poId: string; clientName: string; location: string; salesPerson: string },
  stock: {
    id: number;
    serialNumber: string;
    modelNumber: string;
    materialType: string;
    location: string;
  }
) {
  const allocation = await tx.pOSerialAllocation.create({
    data: {
      poMasterId: po.id,
      model: stock.modelNumber,
      serialNumber: stock.serialNumber,
      stockType: stock.materialType,
      status: "Reserved",
      stockMasterId: stock.id,
    },
  });

  await tx.stockMaster.update({
    where: { id: stock.id },
    data: {
      currentStatus: "Reserved",
      currentHolder: po.clientName,
      location: po.location || stock.location,
    },
  });

  await tx.stockMovement.create({
    data: {
      movementId: generateId("MOV"),
      stockMasterId: stock.id,
      serialNumber: stock.serialNumber,
      fromLocation: stock.location,
      toLocation: po.location || po.clientName,
      movementType: "PO Reservation",
      user: po.salesPerson || "Admin",
      remarks: `Reserved for PO ${po.poId} (${po.clientName})`,
    },
  });

  return allocation;
}

export async function createPOWithStock(
  data: {
    clientName: string;
    location?: string;
    poNumber: string;
    poDate?: string;
    orderType?: string;
    salesPerson?: string;
    unitValue?: number;
    advanceRequired?: boolean;
    advanceReceived?: boolean;
    expectedDeliveryDate?: string | null;
    status?: string;
    remarks?: string | null;
  },
  serialNumbers: string[]
) {
  return executeWithRetry(() => createPOWithStockImpl(data, serialNumbers));
}

async function createPOWithStockImpl(
  data: {
    clientName: string;
    location?: string;
    poNumber: string;
    poDate?: string;
    orderType?: string;
    salesPerson?: string;
    unitValue?: number;
    advanceRequired?: boolean;
    advanceReceived?: boolean;
    expectedDeliveryDate?: string | null;
    status?: string;
    remarks?: string | null;
  },
  serialNumbers: string[]
) {
  if (!serialNumbers.length) {
    throw new Error("Select at least one serial from Stock Master");
  }

  const uniqueSerials = Array.from(new Set(serialNumbers));
  if (uniqueSerials.length !== serialNumbers.length) {
    throw new Error("Duplicate serial numbers selected");
  }

  const stocks = await prisma.stockMaster.findMany({
    where: { serialNumber: { in: uniqueSerials } },
  });

  if (stocks.length !== uniqueSerials.length) {
    const found = new Set(stocks.map((s) => s.serialNumber));
    const missing = uniqueSerials.filter((s) => !found.has(s));
    throw new Error(`Serial not found in stock: ${missing.join(", ")}`);
  }

  for (const stock of stocks) {
    if (stock.currentStatus !== "Available") {
      throw new Error(`${stock.serialNumber} is not available (${stock.currentStatus})`);
    }
  }

  const reservedElsewhere = await prisma.pOSerialAllocation.findMany({
    where: { serialNumber: { in: uniqueSerials }, status: "Reserved" },
  });
  if (reservedElsewhere.length) {
    throw new Error(`${reservedElsewhere[0].serialNumber} is already reserved on another PO`);
  }

  const models = Array.from(new Set(stocks.map((s) => s.modelNumber)));
  const quantityOrdered = stocks.length;
  const unitValue = Number(data.unitValue) || 0;
  const totalPoValue = quantityOrdered * unitValue;

  return prisma.$transaction(async (tx) => {
    let poId = await nextPOId(tx);
    let po;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        po = await tx.pOMaster.create({
          data: {
            poId,
            clientName: data.clientName,
            location: data.location || "",
            poNumber: data.poNumber,
            poDate: data.poDate ? new Date(data.poDate) : new Date(),
            orderType: data.orderType || "New Supply",
            salesPerson: data.salesPerson || "",
            itemDescription: models.join(", "),
            quantityOrdered,
            unitValue,
            totalPoValue,
            advanceRequired: Boolean(data.advanceRequired),
            advanceReceived: Boolean(data.advanceReceived),
            expectedDeliveryDate: data.expectedDeliveryDate
              ? new Date(data.expectedDeliveryDate)
              : null,
            status: data.status || "PO",
            remarks: data.remarks || null,
          },
        });
        break;
      } catch (error) {
        if (isDuplicatePoIdError(error) && attempt < 4) {
          const parts = poId.split("-");
          const nextSeq = parseInt(parts[parts.length - 1], 10) + 1;
          poId = `${parts.slice(0, -1).join("-")}-${String(nextSeq).padStart(3, "0")}`;
          continue;
        }
        throw error;
      }
    }

    if (!po) throw new Error("Failed to generate unique PO ID");

    const serialAllocations = [];
    for (const stock of stocks) {
      serialAllocations.push(await reserveSerialInTx(tx, po, stock));
    }

    return { ...po, serialAllocations };
  }, TX_OPTIONS);
}

export async function dispatchSerial(allocationId: number) {
  return executeWithRetry(() => dispatchSerialImpl(allocationId));
}

async function dispatchSerialImpl(allocationId: number) {
  const allocation = await prisma.pOSerialAllocation.findUnique({
    where: { id: allocationId },
    include: { poMaster: true, stockMaster: true },
  });
  if (!allocation) throw new Error("Allocation not found");
  if (allocation.status === "Sold") throw new Error("Serial already dispatched");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.pOSerialAllocation.update({
      where: { id: allocationId },
      data: { status: "Sold" },
    });

    await tx.stockMaster.update({
      where: { id: allocation.stockMasterId },
      data: {
        currentStatus: "Sold",
        currentHolder: "Customer",
        location: allocation.poMaster.location,
      },
    });

    await tx.stockMovement.create({
      data: {
        movementId: generateId("MOV"),
        stockMasterId: allocation.stockMasterId,
        serialNumber: allocation.serialNumber,
        fromLocation: allocation.stockMaster.location,
        toLocation: allocation.poMaster.clientName,
        movementType: "Sale",
        user: allocation.poMaster.salesPerson,
        remarks: `Dispatched via PO ${allocation.poMaster.poId} to ${allocation.poMaster.clientName}`,
      },
    });

    return updated;
  }, TX_OPTIONS);
}

export async function dispatchAllReserved(poMasterId: number) {
  return executeWithRetry(() => dispatchAllReservedImpl(poMasterId));
}

async function dispatchAllReservedImpl(poMasterId: number) {
  const allocations = await prisma.pOSerialAllocation.findMany({
    where: { poMasterId, status: "Reserved" },
    include: { poMaster: true, stockMaster: true },
  });

  if (!allocations.length) {
    await prisma.pOMaster.update({
      where: { id: poMasterId },
      data: { status: "Completed" },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const allocation of allocations) {
      await tx.pOSerialAllocation.update({
        where: { id: allocation.id },
        data: { status: "Sold" },
      });

      await tx.stockMaster.update({
        where: { id: allocation.stockMasterId },
        data: {
          currentStatus: "Sold",
          currentHolder: "Customer",
          location: allocation.poMaster.location,
        },
      });

      await tx.stockMovement.create({
        data: {
          movementId: generateId("MOV"),
          stockMasterId: allocation.stockMasterId,
          serialNumber: allocation.serialNumber,
          fromLocation: allocation.stockMaster.location,
          toLocation: allocation.poMaster.clientName,
          movementType: "Sale",
          user: allocation.poMaster.salesPerson,
          remarks: `Dispatched via PO ${allocation.poMaster.poId} to ${allocation.poMaster.clientName}`,
        },
      });
    }

    await tx.pOMaster.update({
      where: { id: poMasterId },
      data: { status: "Completed" },
    });
  }, TX_OPTIONS);
}

export async function releaseSerial(allocationId: number) {
  return executeWithRetry(() => releaseSerialImpl(allocationId));
}

async function releaseSerialImpl(allocationId: number) {
  const allocation = await prisma.pOSerialAllocation.findUnique({
    where: { id: allocationId },
    include: { poMaster: true, stockMaster: true },
  });
  if (!allocation) throw new Error("Allocation not found");
  if (allocation.status === "Sold") throw new Error("Cannot release a dispatched serial");

  return prisma.$transaction(async (tx) => {
    await tx.pOSerialAllocation.delete({ where: { id: allocationId } });

    await tx.stockMaster.update({
      where: { id: allocation.stockMasterId },
      data: {
        currentStatus: "Available",
        currentHolder: "Store",
        location: "Main Store",
      },
    });

    await tx.stockMovement.create({
      data: {
        movementId: generateId("MOV"),
        stockMasterId: allocation.stockMasterId,
        serialNumber: allocation.serialNumber,
        fromLocation: allocation.poMaster.location,
        toLocation: "Main Store",
        movementType: "PO Release",
        remarks: `Released from PO ${allocation.poMaster.poId}`,
      },
    });

    await syncPOMetrics(tx, allocation.poMasterId);
  }, TX_OPTIONS);
}
