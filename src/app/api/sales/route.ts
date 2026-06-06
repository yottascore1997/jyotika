import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateStock } from "@/lib/stock-service";
import { serializeSale } from "@/lib/serializers";

export async function GET() {
  try {
    const sales = await prisma.assetSale.findMany({
      orderBy: { saleDate: "desc" },
    });
    return NextResponse.json(sales.map(serializeSale));
  } catch (error) {
    console.error("GET /api/sales:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.serialNumber || !body.customer || !body.invoiceNumber) {
      return NextResponse.json(
        { error: "serialNumber, customer, and invoiceNumber are required" },
        { status: 400 }
      );
    }

    const existingInvoice = await prisma.assetSale.findUnique({
      where: { invoiceNumber: body.invoiceNumber },
    });
    if (existingInvoice) {
      return NextResponse.json(
        { error: `Invoice number ${body.invoiceNumber} already exists` },
        { status: 409 }
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

    if (stock.currentStatus === "Sold") {
      return NextResponse.json({ error: "Stock is already sold" }, { status: 400 });
    }

    const saleDate = body.saleDate ? new Date(body.saleDate) : new Date();

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.assetSale.create({
        data: {
          invoiceNumber: body.invoiceNumber,
          customer: body.customer,
          serialNumber: body.serialNumber,
          saleDate,
          amount: Number(body.amount) || 0,
          stockMasterId: stock.id,
        },
      });

      await updateStock({
        stockMasterId: stock.id,
        serialNumber: stock.serialNumber,
        currentStatus: "Sold",
        currentHolder: "Customer",
        location: "Customer Site",
        fromLocation: stock.location,
        toLocation: "Customer Site",
        movementType: "Sale",
        remarks: `Sale — Invoice ${body.invoiceNumber}`,
      });

      return created;
    });

    return NextResponse.json(serializeSale(sale), { status: 201 });
  } catch (error) {
    console.error("POST /api/sales:", error);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}
