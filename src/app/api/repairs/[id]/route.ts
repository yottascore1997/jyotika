import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateStock } from "@/lib/stock-service";
import { serializeRepair } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid repair ID" }, { status: 400 });
    }

    const repair = await prisma.repairCase.findUnique({
      where: { id },
      include: { stockMaster: true },
    });
    if (!repair) {
      return NextResponse.json({ error: "Repair case not found" }, { status: 404 });
    }

    const body = await request.json();
    const newStatus = body.status ?? repair.status;

    const updateData: {
      status?: string;
      repairStartDate?: Date;
      repairCompletionDate?: Date;
      returnDate?: Date;
      remarks?: string | null;
    } = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.remarks !== undefined) updateData.remarks = body.remarks;
    if (body.repairStartDate !== undefined)
      updateData.repairStartDate = new Date(body.repairStartDate);
    if (body.repairCompletionDate !== undefined)
      updateData.repairCompletionDate = new Date(body.repairCompletionDate);
    if (body.returnDate !== undefined) updateData.returnDate = new Date(body.returnDate);

    if (newStatus === "Under Repair" && !body.repairStartDate && !repair.repairStartDate) {
      updateData.repairStartDate = new Date();
    }
    if (newStatus === "Repaired" && !body.repairCompletionDate && !repair.repairCompletionDate) {
      updateData.repairCompletionDate = new Date();
    }
    if (newStatus === "Returned" && !body.returnDate && !repair.returnDate) {
      updateData.returnDate = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.repairCase.update({
        where: { id },
        data: updateData,
      });

      if (newStatus === "Returned" && repair.status !== "Returned") {
        await updateStock({
          stockMasterId: repair.stockMasterId,
          serialNumber: repair.serialNumber,
          currentStatus: "Available",
          currentHolder: "Store",
          location: "Main Store",
          fromLocation: repair.stockMaster.location,
          toLocation: "Main Store",
          movementType: "Repair Return",
          remarks: `Repair return ${repair.repairId}`,
        });
      }

      return result;
    });

    return NextResponse.json(serializeRepair(updated));
  } catch (error) {
    console.error("PUT /api/repairs/[id]:", error);
    return NextResponse.json({ error: "Failed to update repair case" }, { status: 500 });
  }
}
