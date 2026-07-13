import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePOId } from "@/lib/po-service";
import { serializePO } from "@/lib/serializers";

export async function GET() {
  try {
    const rows = await prisma.pOMaster.findMany({
      orderBy: { poDate: "desc" },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        serialAllocations: true,
        _count: { select: { serialAllocations: true } },
      },
    });
    return NextResponse.json(rows.map(serializePO));
  } catch (error) {
    console.error("GET /api/po:", error);
    return NextResponse.json({ error: "Failed to fetch PO records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.clientName || !body.poNumber) {
      return NextResponse.json(
        { error: "clientName and poNumber are required" },
        { status: 400 }
      );
    }

    const poId = await generatePOId();
    const quantityOrdered = Number(body.quantityOrdered) || 1;
    const unitValue = Number(body.unitValue) || 0;
    const totalPoValue = quantityOrdered * unitValue;

    const po = await prisma.pOMaster.create({
      data: {
        poId,
        clientName: body.clientName,
        location: body.location || "",
        poNumber: body.poNumber,
        poDate: body.poDate ? new Date(body.poDate) : new Date(),
        orderType: body.orderType || "New Supply",
        salesPerson: body.salesPerson || "",
        itemDescription: body.itemDescription || "",
        serialNumber: body.serialNumber || null,
        quantityOrdered,
        unitValue,
        totalPoValue,
        advanceRequired: Boolean(body.advanceRequired),
        advanceReceived: Boolean(body.advanceReceived),
        expectedDeliveryDate: body.expectedDeliveryDate
          ? new Date(body.expectedDeliveryDate)
          : null,
        status: body.status || "PO",
        remarks: body.remarks || null,
      },
    });

    return NextResponse.json(serializePO(po!), { status: 201 });
  } catch (error) {
    console.error("POST /api/po:", error);
    const message = error instanceof Error ? error.message : "Failed to create PO";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
