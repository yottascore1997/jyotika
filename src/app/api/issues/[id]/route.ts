import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateStock } from "@/lib/stock-service";
import { serializeIssue } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 });
    }

    const issue = await prisma.materialIssue.findUnique({
      where: { id },
      include: { stockMaster: true },
    });
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    if (issue.status === "Returned") {
      return NextResponse.json({ error: "Issue already returned" }, { status: 400 });
    }

    const body = await request.json();
    const actualReturnDate = body.actualReturnDate
      ? new Date(body.actualReturnDate)
      : new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.materialIssue.update({
        where: { id },
        data: {
          actualReturnDate,
          status: "Returned",
          ...(body.remarks !== undefined && { remarks: body.remarks }),
        },
      });

      await updateStock({
        stockMasterId: issue.stockMasterId,
        serialNumber: issue.serialNumber,
        currentStatus: "Available",
        currentHolder: "Store",
        location: "Main Store",
        fromLocation: issue.stockMaster.location,
        toLocation: "Main Store",
        movementType: "Return",
        remarks: `Return for issue ${issue.issueNumber}`,
      });

      return result;
    });

    return NextResponse.json(serializeIssue(updated));
  } catch (error) {
    console.error("PUT /api/issues/[id]:", error);
    return NextResponse.json({ error: "Failed to return issue" }, { status: 500 });
  }
}
