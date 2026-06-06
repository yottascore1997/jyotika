import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeOemReturn } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid OEM return ID" }, { status: 400 });
    }

    const existing = await prisma.oEMReturn.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "OEM return not found" }, { status: 404 });
    }

    const body = await request.json();

    const updated = await prisma.oEMReturn.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.oemName !== undefined && { oemName: body.oemName }),
        ...(body.reason !== undefined && { reason: body.reason }),
        ...(body.returnDate !== undefined && { returnDate: new Date(body.returnDate) }),
        ...(body.remarks !== undefined && { remarks: body.remarks }),
      },
    });

    return NextResponse.json(serializeOemReturn(updated));
  } catch (error) {
    console.error("PUT /api/oem-returns/[id]:", error);
    return NextResponse.json({ error: "Failed to update OEM return" }, { status: 500 });
  }
}
