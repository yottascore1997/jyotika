import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateStock } from "@/lib/stock-service";
import { serializeHandover } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid handover ID" }, { status: 400 });
    }

    const handover = await prisma.customerHandover.findUnique({
      where: { id },
      include: { stockMaster: true },
    });
    if (!handover) {
      return NextResponse.json({ error: "Handover not found" }, { status: 404 });
    }

    if (handover.status === "Returned") {
      return NextResponse.json({ error: "Handover already returned" }, { status: 400 });
    }

    const body = await request.json();
    const actualReturnDate = body.actualReturnDate
      ? new Date(body.actualReturnDate)
      : new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.customerHandover.update({
        where: { id },
        data: {
          actualReturnDate,
          status: "Returned",
          ...(body.remarks !== undefined && { remarks: body.remarks }),
        },
      });

      await updateStock({
        stockMasterId: handover.stockMasterId,
        serialNumber: handover.serialNumber,
        currentStatus: "Available",
        currentHolder: "Store",
        location: "Main Store",
        fromLocation: handover.stockMaster.location,
        toLocation: "Main Store",
        movementType: "Customer Return",
        remarks: `Return from ${handover.customerName}`,
      });

      return result;
    });

    return NextResponse.json(serializeHandover(updated));
  } catch (error) {
    console.error("PUT /api/handovers/[id]:", error);
    return NextResponse.json({ error: "Failed to return handover" }, { status: 500 });
  }
}
