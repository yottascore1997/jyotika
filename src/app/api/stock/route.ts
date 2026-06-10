import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateId } from "@/lib/stock-service";
import { serializeStock } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const view = request.nextUrl.searchParams.get("view");
    const stock = await prisma.stockMaster.findMany({
      where: view === "all" ? undefined : { stockSetId: null },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        ...(view === "all" ? { stockSet: { select: { setId: true, id: true } } } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(stock.map(serializeStock));
  } catch (error) {
    console.error("GET /api/stock:", error);
    return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.serialNumber || !body.modelNumber || !body.category || !body.materialType) {
      return NextResponse.json(
        { error: "serialNumber, modelNumber, category, and materialType are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.stockMaster.findUnique({
      where: { serialNumber: body.serialNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Serial number ${body.serialNumber} already exists` },
        { status: 409 }
      );
    }

    const stock = await prisma.$transaction(async (tx) => {
      const created = await tx.stockMaster.create({
        data: {
          stockId: generateId("STK"),
          materialType: body.materialType,
          oemSupplier: body.oemSupplier || body.supplierOem || "Unknown",
          make: body.make || null,
          modelNumber: body.modelNumber,
          serialNumber: body.serialNumber,
          description: body.description || body.materialDescription || null,
          category: body.category,
          receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
          warrantyStatus: body.warrantyStatus || "Active",
          poNumber: body.poNumber || null,
          purchaseCost: Number(body.purchaseCost) || 0,
          currentStatus: body.currentStatus || "Available",
          currentHolder: body.currentHolder || "Store",
          location: body.location || "Main Store",
          remarks: body.remarks || null,
          quantity: Number(body.quantity) || 1,
          quantityUnit: body.quantityUnit || "set",
          purpose: body.purpose || null,
          commercialInvoiceNo: body.commercialInvoiceNo || null,
          commercialInvoiceDate: body.commercialInvoiceDate
            ? new Date(body.commercialInvoiceDate)
            : null,
          awbNumber: body.awbNumber || null,
          workingCondition: body.workingCondition || null,
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
          user: body.receivedBy || "Admin",
          remarks: body.remarks || "Manual stock entry",
          date: created.receivedDate,
        },
      });

      return created;
    });

    return NextResponse.json(serializeStock(stock), { status: 201 });
  } catch (error) {
    console.error("POST /api/stock:", error);
    return NextResponse.json({ error: "Failed to create stock" }, { status: 500 });
  }
}
