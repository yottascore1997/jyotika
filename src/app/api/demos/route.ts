import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcDaysOut, generateId, isOverdue, updateStock } from "@/lib/stock-service";
import { serializeDemo } from "@/lib/serializers";

async function syncOverdueDemos() {
  const activeDemos = await prisma.demoTracking.findMany({
    where: { status: "Active" },
  });
  const overdueIds = activeDemos
    .filter((d) => isOverdue(d.expectedReturnDate, d.actualReturnDate))
    .map((d) => d.id);

  if (overdueIds.length) {
    await prisma.demoTracking.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: "Overdue" },
    });
  }
}

export async function GET() {
  try {
    await syncOverdueDemos();

    const demos = await prisma.demoTracking.findMany({
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json(
      demos.map((demo) => {
        const daysOut = calcDaysOut(demo.issueDate, demo.actualReturnDate);
        const status =
          demo.status === "Active" && isOverdue(demo.expectedReturnDate, demo.actualReturnDate)
            ? "Overdue"
            : demo.status;
        return serializeDemo({ ...demo, status, daysOut });
      })
    );
  } catch (error) {
    console.error("GET /api/demos:", error);
    return NextResponse.json({ error: "Failed to fetch demos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.serialNumber || !body.salesPerson) {
      return NextResponse.json(
        { error: "serialNumber and salesPerson are required" },
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

    const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();

    const demo = await prisma.$transaction(async (tx) => {
      const created = await tx.demoTracking.create({
        data: {
          demoId: body.demoId || generateId("DMO"),
          serialNumber: body.serialNumber,
          model: body.model || stock.modelNumber,
          salesPerson: body.salesPerson,
          customer: body.customer || null,
          issueDate,
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
        currentStatus: "Demo",
        currentHolder: "Sales Person",
        location: "Sales Demo",
        fromLocation: stock.location,
        toLocation: "Sales Demo",
        movementType: "Demo Issue",
        remarks: `Demo ${created.demoId}`,
      });

      return created;
    });

    const daysOut = calcDaysOut(demo.issueDate, demo.actualReturnDate);
    return NextResponse.json(serializeDemo({ ...demo, daysOut }), { status: 201 });
  } catch (error) {
    console.error("POST /api/demos:", error);
    return NextResponse.json({ error: "Failed to create demo" }, { status: 500 });
  }
}
