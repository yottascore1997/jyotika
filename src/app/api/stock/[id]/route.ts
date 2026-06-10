import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeStock } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid stock ID" }, { status: 400 });
    }

    const existing = await prisma.stockMaster.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const body = await request.json();

    if (body.serialNumber && body.serialNumber !== existing.serialNumber) {
      const duplicate = await prisma.stockMaster.findUnique({
        where: { serialNumber: body.serialNumber },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Serial number ${body.serialNumber} already exists` },
          { status: 409 }
        );
      }
    }

    const stock = await prisma.stockMaster.update({
      where: { id },
      data: {
        ...(body.materialType !== undefined && { materialType: body.materialType }),
        ...(body.oemSupplier !== undefined && { oemSupplier: body.oemSupplier }),
        ...(body.make !== undefined && { make: body.make }),
        ...(body.modelNumber !== undefined && { modelNumber: body.modelNumber }),
        ...(body.serialNumber !== undefined && { serialNumber: body.serialNumber }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.receivedDate !== undefined && { receivedDate: new Date(body.receivedDate) }),
        ...(body.warrantyStatus !== undefined && { warrantyStatus: body.warrantyStatus }),
        ...(body.poNumber !== undefined && { poNumber: body.poNumber }),
        ...(body.purchaseCost !== undefined && { purchaseCost: Number(body.purchaseCost) }),
        ...(body.currentStatus !== undefined && { currentStatus: body.currentStatus }),
        ...(body.currentHolder !== undefined && { currentHolder: body.currentHolder }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.remarks !== undefined && { remarks: body.remarks }),
        ...(body.quantity !== undefined && { quantity: Number(body.quantity) }),
        ...(body.quantityUnit !== undefined && { quantityUnit: body.quantityUnit }),
        ...(body.purpose !== undefined && { purpose: body.purpose }),
        ...(body.commercialInvoiceNo !== undefined && { commercialInvoiceNo: body.commercialInvoiceNo }),
        ...(body.commercialInvoiceDate !== undefined && {
          commercialInvoiceDate: body.commercialInvoiceDate ? new Date(body.commercialInvoiceDate) : null,
        }),
        ...(body.awbNumber !== undefined && { awbNumber: body.awbNumber }),
        ...(body.workingCondition !== undefined && { workingCondition: body.workingCondition }),
      },
    });

    return NextResponse.json(serializeStock(stock));
  } catch (error) {
    console.error("PUT /api/stock/[id]:", error);
    return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid stock ID" }, { status: 400 });
    }

    const existing = await prisma.stockMaster.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.stockMovement.deleteMany({ where: { stockMasterId: id } }),
      prisma.materialIssue.deleteMany({ where: { stockMasterId: id } }),
      prisma.demoTracking.deleteMany({ where: { stockMasterId: id } }),
      prisma.customerHandover.deleteMany({ where: { stockMasterId: id } }),
      prisma.repairCase.deleteMany({ where: { stockMasterId: id } }),
      prisma.serviceRecord.deleteMany({ where: { stockMasterId: id } }),
      prisma.oEMReturn.deleteMany({ where: { stockMasterId: id } }),
      prisma.assetSale.deleteMany({ where: { stockMasterId: id } }),
      prisma.materialReceipt.deleteMany({ where: { stockMasterId: id } }),
      prisma.stockMaster.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Stock deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/stock/[id]:", error);
    return NextResponse.json({ error: "Failed to delete stock" }, { status: 500 });
  }
}
