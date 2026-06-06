import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcDaysOut, updateStock } from "@/lib/stock-service";
import { serializeDemo } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid demo ID" }, { status: 400 });
    }

    const demo = await prisma.demoTracking.findUnique({
      where: { id },
      include: { stockMaster: true },
    });
    if (!demo) {
      return NextResponse.json({ error: "Demo not found" }, { status: 404 });
    }

    if (demo.status === "Returned") {
      return NextResponse.json({ error: "Demo already returned" }, { status: 400 });
    }

    const body = await request.json();
    const actualReturnDate = body.actualReturnDate
      ? new Date(body.actualReturnDate)
      : new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.demoTracking.update({
        where: { id },
        data: {
          actualReturnDate,
          status: "Returned",
          ...(body.remarks !== undefined && { remarks: body.remarks }),
        },
      });

      await updateStock({
        stockMasterId: demo.stockMasterId,
        serialNumber: demo.serialNumber,
        currentStatus: "Available",
        currentHolder: "Store",
        location: "Main Store",
        fromLocation: demo.stockMaster.location,
        toLocation: "Main Store",
        movementType: "Demo Return",
        remarks: `Demo return ${demo.demoId}`,
      });

      return result;
    });

    const daysOut = calcDaysOut(updated.issueDate, updated.actualReturnDate);
    return NextResponse.json(serializeDemo({ ...updated, daysOut }));
  } catch (error) {
    console.error("PUT /api/demos/[id]:", error);
    return NextResponse.json({ error: "Failed to return demo" }, { status: 500 });
  }
}
