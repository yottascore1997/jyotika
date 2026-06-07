import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPOWithStock } from "@/lib/po-service";
import { serializePO } from "@/lib/serializers";

export async function GET() {
  try {
    const rows = await prisma.pOMaster.findMany({
      orderBy: { poDate: "desc" },
      include: {
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

    if (!Array.isArray(body.serialNumbers) || body.serialNumbers.length === 0) {
      return NextResponse.json(
        { error: "Select at least one serial from Stock Master" },
        { status: 400 }
      );
    }

    const po = await createPOWithStock(
      {
        clientName: body.clientName,
        location: body.location,
        poNumber: body.poNumber,
        poDate: body.poDate,
        orderType: body.orderType,
        salesPerson: body.salesPerson,
        unitValue: body.unitValue,
        advanceRequired: body.advanceRequired,
        advanceReceived: body.advanceReceived,
        expectedDeliveryDate: body.expectedDeliveryDate,
        status: body.status,
        remarks: body.remarks,
      },
      body.serialNumbers
    );

    return NextResponse.json(serializePO(po!), { status: 201 });
  } catch (error) {
    console.error("POST /api/po:", error);
    const message = error instanceof Error ? error.message : "Failed to create PO";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
