import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateId, updateStock } from "@/lib/stock-service";
import { serializeRepair } from "@/lib/serializers";

export async function GET() {
  try {
    const repairs = await prisma.repairCase.findMany({
      where: { status: { not: "Closed" } },
      orderBy: { receivedDate: "desc" },
    });
    return NextResponse.json(repairs.map(serializeRepair));
  } catch (error) {
    console.error("GET /api/repairs:", error);
    return NextResponse.json({ error: "Failed to fetch repairs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.serialNumber || !body.customerName || !body.complaint) {
      return NextResponse.json(
        { error: "serialNumber, customerName, and complaint are required" },
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

    const receivedDate = body.receivedDate ? new Date(body.receivedDate) : new Date();

    const repair = await prisma.$transaction(async (tx) => {
      const created = await tx.repairCase.create({
        data: {
          repairId: body.repairId || generateId("REP"),
          serialNumber: body.serialNumber,
          customerName: body.customerName,
          complaint: body.complaint,
          receivedDate,
          status: "Received",
          remarks: body.remarks || null,
          stockMasterId: stock.id,
        },
      });

      await updateStock({
        stockMasterId: stock.id,
        serialNumber: stock.serialNumber,
        currentStatus: "Repair",
        currentHolder: "Service Department",
        location: "Service Department",
        fromLocation: stock.location,
        toLocation: "Service Department",
        movementType: "Repair Receipt",
        remarks: `Repair ${created.repairId}`,
      });

      return created;
    });

    return NextResponse.json(serializeRepair(repair), { status: 201 });
  } catch (error) {
    console.error("POST /api/repairs:", error);
    return NextResponse.json({ error: "Failed to create repair case" }, { status: 500 });
  }
}
