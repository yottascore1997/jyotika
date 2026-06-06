import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateId, updateStock } from "@/lib/stock-service";
import { serializeIssue } from "@/lib/serializers";
import type { MovementType } from "@/lib/constants";

const PURPOSE_MAP: Record<
  string,
  { status: string; holder: string; movementType: MovementType; toLocation: string }
> = {
  Demo: { status: "Demo", holder: "Sales Person", movementType: "Demo Issue", toLocation: "Sales" },
  "Customer Trial": {
    status: "Customer Trial",
    holder: "Customer",
    movementType: "Customer Handover",
    toLocation: "Customer Site",
  },
  Exhibition: {
    status: "Issued",
    holder: "Sales Person",
    movementType: "Issue",
    toLocation: "Exhibition",
  },
  "Service Support": {
    status: "Repair",
    holder: "Service Department",
    movementType: "Repair Receipt",
    toLocation: "Service Department",
  },
  "Loaner Unit": {
    status: "Issued",
    holder: "Customer",
    movementType: "Issue",
    toLocation: "Customer Site",
  },
  Sale: { status: "Sold", holder: "Customer", movementType: "Sale", toLocation: "Customer Site" },
  "OEM Return": {
    status: "Returned To OEM",
    holder: "OEM",
    movementType: "OEM Return",
    toLocation: "OEM",
  },
  Calibration: {
    status: "Calibration",
    holder: "Service Department",
    movementType: "Issue",
    toLocation: "Calibration Lab",
  },
  "Internal Testing": {
    status: "Issued",
    holder: "Sales Person",
    movementType: "Issue",
    toLocation: "Internal",
  },
};

export async function GET() {
  try {
    const issues = await prisma.materialIssue.findMany({
      include: { stockMaster: true },
      orderBy: { issueDate: "desc" },
    });
    return NextResponse.json(issues.map(serializeIssue));
  } catch (error) {
    console.error("GET /api/issues:", error);
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.serialNumber || !body.purpose || !body.issuedTo) {
      return NextResponse.json(
        { error: "serialNumber, purpose, and issuedTo are required" },
        { status: 400 }
      );
    }

    const mapping = PURPOSE_MAP[body.purpose];
    if (!mapping) {
      return NextResponse.json(
        { error: `Invalid purpose. Valid values: ${Object.keys(PURPOSE_MAP).join(", ")}` },
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

    const issue = await prisma.$transaction(async (tx) => {
      const created = await tx.materialIssue.create({
        data: {
          issueNumber: body.issueNumber || generateId("ISS"),
          issueDate,
          serialNumber: body.serialNumber,
          materialDescription: body.materialDescription || stock.description || stock.modelNumber,
          issuedTo: body.issuedTo,
          customerName: body.customerName || null,
          purpose: body.purpose,
          expectedReturnDate: body.expectedReturnDate
            ? new Date(body.expectedReturnDate)
            : null,
          status: "Issued",
          remarks: body.remarks || null,
          stockMasterId: stock.id,
        },
      });

      await updateStock({
        stockMasterId: stock.id,
        serialNumber: stock.serialNumber,
        currentStatus: mapping.status,
        currentHolder: mapping.holder,
        location: mapping.toLocation,
        fromLocation: stock.location,
        toLocation: mapping.toLocation,
        movementType: mapping.movementType,
        remarks: `Issue ${created.issueNumber} — ${body.purpose}`,
      });

      return created;
    });

    return NextResponse.json(serializeIssue(issue), { status: 201 });
  } catch (error) {
    console.error("POST /api/issues:", error);
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
  }
}
