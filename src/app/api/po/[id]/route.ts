import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchAllReserved } from "@/lib/po-service";
import { deletePoImageFile } from "@/lib/po-images";
import { serializePO } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const po = await prisma.pOMaster.findUnique({
      where: { id: Number(params.id) },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        serialAllocations: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!po) return NextResponse.json({ error: "PO not found" }, { status: 404 });
    return NextResponse.json(serializePO(po));
  } catch (error) {
    console.error("GET /api/po/[id]:", error);
    return NextResponse.json({ error: "Failed to fetch PO" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const id = Number(params.id);

    const existing = await prisma.pOMaster.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "PO not found" }, { status: 404 });

    const quantityOrdered = body.quantityOrdered !== undefined
      ? Number(body.quantityOrdered)
      : existing.quantityOrdered;
    const unitValue = body.unitValue !== undefined ? Number(body.unitValue) : Number(existing.unitValue);
    const totalPoValue = quantityOrdered * unitValue;

    const po = await prisma.pOMaster.update({
      where: { id },
      data: {
        clientName: body.clientName ?? existing.clientName,
        location: body.location ?? existing.location,
        poNumber: body.poNumber ?? existing.poNumber,
        poDate: body.poDate ? new Date(body.poDate) : existing.poDate,
        orderType: body.orderType ?? existing.orderType,
        salesPerson: body.salesPerson ?? existing.salesPerson,
        itemDescription: body.itemDescription ?? existing.itemDescription,
        quantityOrdered,
        unitValue,
        totalPoValue,
        advanceRequired: body.advanceRequired !== undefined ? Boolean(body.advanceRequired) : existing.advanceRequired,
        advanceReceived: body.advanceReceived !== undefined ? Boolean(body.advanceReceived) : existing.advanceReceived,
        expectedDeliveryDate: body.expectedDeliveryDate !== undefined
          ? body.expectedDeliveryDate
            ? new Date(body.expectedDeliveryDate)
            : null
          : existing.expectedDeliveryDate,
        status: body.status ?? existing.status,
        remarks: body.remarks !== undefined ? body.remarks : existing.remarks,
      },
      include: { images: { orderBy: { sortOrder: "asc" } }, serialAllocations: true },
    });

    if (body.status === "Dispatch" && existing.status !== "Dispatch") {
      await dispatchAllReserved(id);
      const refreshed = await prisma.pOMaster.findUnique({
        where: { id },
        include: { images: { orderBy: { sortOrder: "asc" } }, serialAllocations: true },
      });
      return NextResponse.json(serializePO(refreshed!));
    }

    return NextResponse.json(serializePO(po));
  } catch (error) {
    console.error("PUT /api/po/[id]:", error);
    const message = error instanceof Error ? error.message : "Failed to update PO";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    const allocations = await prisma.pOSerialAllocation.findMany({ where: { poMasterId: id } });
    const sold = allocations.filter((a) => a.status === "Sold");
    if (sold.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete PO with dispatched serials" },
        { status: 400 }
      );
    }

    const { releaseSerial } = await import("@/lib/po-service");
    for (const allocation of allocations) {
      await releaseSerial(allocation.id);
    }

    const po = await prisma.pOMaster.findUnique({
      where: { id },
      include: { images: true },
    });
    if (po) {
      await Promise.all(po.images.map((image) => deletePoImageFile(image.filePath)));
    }

    await prisma.pOMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/po/[id]:", error);
    return NextResponse.json({ error: "Failed to delete PO" }, { status: 500 });
  }
}
