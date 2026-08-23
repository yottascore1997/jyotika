import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createMaterialReceiptForStock,
  generateId,
  updateStock,
} from "@/lib/stock-service";
import { serializeRepair } from "@/lib/serializers";

function resolveWarranty(
  stock: { receivedDate: Date; warrantyStatus: string },
  receivedDate: Date,
  physicalDamage: boolean
) {
  let warrantyCoverage = "Under Warranty";
  const warrantyExpiry = new Date(stock.receivedDate);
  warrantyExpiry.setFullYear(warrantyExpiry.getFullYear() + 1);

  if (receivedDate > warrantyExpiry || stock.warrantyStatus === "Expired") {
    warrantyCoverage = "Out of Warranty";
  } else if (physicalDamage) {
    warrantyCoverage = "Void - Physical Damage";
  } else if (stock.warrantyStatus === "Not Applicable") {
    warrantyCoverage = "Out of Warranty";
  }

  return warrantyCoverage;
}

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
    const serialNumber = String(body.serialNumber || "").trim();
    const customerName = String(body.customerName || "").trim();
    const complaint = String(body.complaint || "").trim();
    const materialSource =
      body.materialSource === "New" ? "New" : "Existing";

    if (!serialNumber || !customerName || !complaint) {
      return NextResponse.json(
        { error: "serialNumber, customerName, and complaint are required" },
        { status: 400 }
      );
    }

    if (materialSource === "New" && !body.modelNumber?.trim()) {
      return NextResponse.json(
        { error: "modelNumber is required for new material repair" },
        { status: 400 }
      );
    }

    let stock = await prisma.stockMaster.findUnique({
      where: { serialNumber },
    });

    if (materialSource === "Existing" && !stock) {
      return NextResponse.json(
        { error: `Stock not found for serial number ${serialNumber}. Choose Existing only for stock already in Stock Master.` },
        { status: 404 }
      );
    }

    const receivedDate = body.receivedDate ? new Date(body.receivedDate) : new Date();
    const physicalDamage = Boolean(body.physicalDamage);
    const sourceTag = materialSource === "New" ? "[New Material]" : "[Existing Material]";
    const remarks = [sourceTag, body.remarks || ""].filter(Boolean).join(" ").trim();

    const repair = await prisma.$transaction(async (tx) => {
      if (!stock) {
        // New material not yet in stock — create a stock row so repair stays linked
        const createdStock = await tx.stockMaster.create({
          data: {
            stockId: generateId("STK"),
            materialType: body.materialType || "Equipment",
            oemSupplier: body.oemSupplier || customerName || "Customer",
            make: body.make || null,
            modelNumber: String(body.modelNumber).trim(),
            serialNumber,
            description: body.description || complaint,
            category: body.category || "Others",
            receivedDate,
            warrantyStatus: body.warrantyStatus || "Active",
            currentStatus: "Repair",
            currentHolder: "Service Department",
            location: "Service Department",
            purpose: "New Material",
            workingCondition: "Not Working",
            remarks: `Created via New Material repair`,
            quantity: 1,
            quantityUnit: "pcs",
            partRole: body.partRole || "Main Unit - Display",
          },
        });

        await createMaterialReceiptForStock(tx, createdStock, {
          receivedBy: "Service",
          remarks: `Repair inward — New Material`,
        });

        stock = createdStock;
      }

      const warrantyCoverage = resolveWarranty(stock!, receivedDate, physicalDamage);

      const created = await tx.repairCase.create({
        data: {
          repairId: body.repairId || generateId("REP"),
          serialNumber,
          customerName,
          complaint,
          receivedDate,
          status: "Received",
          remarks: remarks || null,
          physicalDamage,
          warrantyCoverage,
          stockMasterId: stock!.id,
        },
      });

      return { created, stockSnapshot: stock! };
    });

    await updateStock({
      stockMasterId: repair.stockSnapshot.id,
      serialNumber: repair.stockSnapshot.serialNumber,
      currentStatus: "Repair",
      currentHolder: "Service Department",
      location: "Service Department",
      fromLocation: repair.stockSnapshot.location,
      toLocation: "Service Department",
      movementType: "Repair Receipt",
      remarks: `Repair ${repair.created.repairId} (${materialSource} Material)`,
    });

    return NextResponse.json(
      {
        ...serializeRepair(repair.created),
        materialSource,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/repairs:", error);
    return NextResponse.json({ error: "Failed to create repair case" }, { status: 500 });
  }
}
