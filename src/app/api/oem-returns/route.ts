import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateId, updateStock } from "@/lib/stock-service";
import { serializeOemReturn } from "@/lib/serializers";

export async function GET() {
  try {
    const returns = await prisma.oEMReturn.findMany({
      orderBy: { returnDate: "desc" },
    });
    return NextResponse.json(returns.map(serializeOemReturn));
  } catch (error) {
    console.error("GET /api/oem-returns:", error);
    return NextResponse.json({ error: "Failed to fetch OEM returns" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.serialNumber || !body.oemName || !body.reason) {
      return NextResponse.json(
        { error: "serialNumber, oemName, and reason are required" },
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

    const returnDate = body.returnDate ? new Date(body.returnDate) : new Date();

    const oemReturn = await prisma.$transaction(async (tx) => {
      const created = await tx.oEMReturn.create({
        data: {
          returnId: body.returnId || generateId("OEM"),
          oemName: body.oemName,
          serialNumber: body.serialNumber,
          returnDate,
          reason: body.reason,
          status: "Pending",
          remarks: body.remarks || null,
          stockMasterId: stock.id,
        },
      });

      await updateStock({
        stockMasterId: stock.id,
        serialNumber: stock.serialNumber,
        currentStatus: "Returned To OEM",
        currentHolder: "OEM",
        location: "OEM",
        fromLocation: stock.location,
        toLocation: "OEM",
        movementType: "OEM Return",
        remarks: `OEM Return ${created.returnId}`,
      });

      return created;
    });

    return NextResponse.json(serializeOemReturn(oemReturn), { status: 201 });
  } catch (error) {
    console.error("POST /api/oem-returns:", error);
    return NextResponse.json({ error: "Failed to create OEM return" }, { status: 500 });
  }
}
