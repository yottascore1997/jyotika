import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteTenderImageFile } from "@/lib/tender-images";
import { serializeTender } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    const tender = await prisma.tender.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }
    return NextResponse.json(serializeTender(tender));
  } catch (error) {
    console.error("GET /api/tenders/[id]:", error);
    return NextResponse.json({ error: "Failed to fetch tender" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    const existing = await prisma.tender.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const body = await request.json();
    const tender = await prisma.tender.update({
      where: { id },
      data: {
        organizationName: body.organizationName ?? existing.organizationName,
        location: body.location ?? existing.location,
        tenderBidNo: body.tenderBidNo ?? existing.tenderBidNo,
        tenderSubmittedDate: body.tenderSubmittedDate
          ? new Date(body.tenderSubmittedDate)
          : existing.tenderSubmittedDate,
        quotedProduct: body.quotedProduct ?? existing.quotedProduct,
        orderValue: body.orderValue !== undefined ? Number(body.orderValue) : existing.orderValue,
        status: body.status ?? existing.status,
        statusAsOnDate: body.statusAsOnDate ?? existing.statusAsOnDate,
      },
    });

    return NextResponse.json(serializeTender(tender));
  } catch (error) {
    console.error("PUT /api/tenders/[id]:", error);
    return NextResponse.json({ error: "Failed to update tender" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    const existing = await prisma.tender.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    await Promise.all(existing.images.map((image) => deleteTenderImageFile(image.filePath)));

    await prisma.tender.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tenders/[id]:", error);
    return NextResponse.json({ error: "Failed to delete tender" }, { status: 500 });
  }
}
