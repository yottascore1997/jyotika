import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateStock } from "@/lib/stock-service";
import { serializeHandover } from "@/lib/serializers";

export async function GET() {
  try {
    const handovers = await prisma.customerHandover.findMany({
      orderBy: { handoverDate: "desc" },
    });
    return NextResponse.json(handovers.map(serializeHandover));
  } catch (error) {
    console.error("GET /api/handovers:", error);
    return NextResponse.json({ error: "Failed to fetch handovers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.serialNumber || !body.customerName) {
      return NextResponse.json(
        { error: "serialNumber and customerName are required" },
        { status: 400 }
      );
    }

    const stock = await prisma.stockMaster.findUnique({
      where: { serialNumber: body.serialNumber },
    });
    if (!stock) {
      return NextResponse.json(
        { error: `Stock not found for serial number ${body.serialNumber}` },
        { status: 404 }
      );
    }

    if (stock.currentStatus !== "Available") {
      return NextResponse.json(
        { error: `Stock is not available (current status: ${stock.currentStatus})` },
        { status: 400 }
      );
    }

    const handoverDate = body.handoverDate ? new Date(body.handoverDate) : new Date();

    const handover = await prisma.$transaction(async (tx) => {
      const created = await tx.customerHandover.create({
        data: {
          customerName: body.customerName,
          customerCompany: body.customerCompany || null,
          serialNumber: body.serialNumber,
          handoverDate,
          expectedReturnDate: body.expectedReturnDate
            ? new Date(body.expectedReturnDate)
            : null,
          status: "Active",
          remarks: body.remarks || null,
          stockMasterId: stock.id,
        },
      });

      await updateStock({
        stockMasterId: stock.id,
        serialNumber: stock.serialNumber,
        currentStatus: "Customer Trial",
        currentHolder: "Customer",
        location: "Customer Site",
        fromLocation: stock.location,
        toLocation: "Customer Site",
        movementType: "Customer Handover",
        remarks: `Handover to ${body.customerName}`,
      });

      return created;
    });

    return NextResponse.json(serializeHandover(handover), { status: 201 });
  } catch (error) {
    console.error("POST /api/handovers:", error);
    return NextResponse.json({ error: "Failed to create handover" }, { status: 500 });
  }
}
