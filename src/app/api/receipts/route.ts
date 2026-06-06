import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateId } from "@/lib/stock-service";
import { serializeReceipt, serializeStock } from "@/lib/serializers";

export async function GET() {
  try {
    const receipts = await prisma.materialReceipt.findMany({
      include: { stockMaster: true },
      orderBy: { receivedDate: "desc" },
    });
    return NextResponse.json(
      receipts.map((r) => ({
        ...serializeReceipt(r),
        stock: serializeStock(r.stockMaster),
      }))
    );
  } catch (error) {
    console.error("GET /api/receipts:", error);
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.grnNumber || !body.serialNumber || !body.modelNumber || !body.materialType) {
      return NextResponse.json(
        { error: "grnNumber, serialNumber, modelNumber, and materialType are required" },
        { status: 400 }
      );
    }

    const existingSerial = await prisma.stockMaster.findUnique({
      where: { serialNumber: body.serialNumber },
    });
    if (existingSerial) {
      return NextResponse.json(
        { error: `Serial number ${body.serialNumber} already exists` },
        { status: 409 }
      );
    }

    const existingGrn = await prisma.materialReceipt.findUnique({
      where: { grnNumber: body.grnNumber },
    });
    if (existingGrn) {
      return NextResponse.json(
        { error: `GRN number ${body.grnNumber} already exists` },
        { status: 409 }
      );
    }

    const receivedDate = body.receivedDate ? new Date(body.receivedDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const stock = await tx.stockMaster.create({
        data: {
          stockId: generateId("STK"),
          materialType: body.materialType,
          oemSupplier: body.supplierOem || "Unknown",
          make: body.make || null,
          modelNumber: body.modelNumber,
          serialNumber: body.serialNumber,
          description: body.materialDescription || null,
          category: body.category || "Other",
          receivedDate,
          warrantyStatus: body.warrantyStatus || "Active",
          poNumber: body.poNumber || null,
          purchaseCost: Number(body.purchaseCost) || 0,
          currentStatus: "Available",
          currentHolder: "Store",
          location: "Main Store",
          remarks: body.remarks || null,
        },
      });

      const receipt = await tx.materialReceipt.create({
        data: {
          grnNumber: body.grnNumber,
          receivedDate,
          supplierOem: body.supplierOem || "Unknown",
          materialDescription: body.materialDescription || body.modelNumber,
          modelNumber: body.modelNumber,
          serialNumber: body.serialNumber,
          quantity: Number(body.quantity) || 1,
          materialType: body.materialType,
          receivedBy: body.receivedBy || "Admin",
          poNumber: body.poNumber || null,
          remarks: body.remarks || null,
          stockMasterId: stock.id,
        },
      });

      await tx.stockMovement.create({
        data: {
          movementId: generateId("MOV"),
          stockMasterId: stock.id,
          serialNumber: stock.serialNumber,
          fromLocation: "Supplier",
          toLocation: "Main Store",
          movementType: "Receipt",
          user: body.receivedBy || "Admin",
          remarks: `GRN ${body.grnNumber}`,
          date: receivedDate,
        },
      });

      return { receipt, stock };
    });

    return NextResponse.json(
      {
        ...serializeReceipt(result.receipt),
        stock: serializeStock(result.stock),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/receipts:", error);
    return NextResponse.json({ error: "Failed to create receipt" }, { status: 500 });
  }
}
