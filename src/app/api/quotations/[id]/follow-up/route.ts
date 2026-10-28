import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeQuotation } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Invalid quotation ID" }, { status: 400 });
    }

    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const body = await request.json();
    const followUpStatus = body.followUpStatus || quotation.followUpStatus;
    const orderStatus = body.orderStatus || quotation.orderStatus;
    const lastFollowUpDate = body.lastFollowUpDate ? new Date(body.lastFollowUpDate) : new Date();
    const nextFollowUpDate = body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : null;
    const nextAction = body.nextAction !== undefined ? String(body.nextAction).trim() : quotation.nextAction;
    const remarks = String(body.remarks || body.followUpRemarks || "").trim();
    const updatedBy = String(body.updatedBy || quotation.salesEngineer || "").trim();

    // 1. Log to history table
    await prisma.quotationFollowUp.create({
      data: {
        quotationId: id,
        followUpDate: lastFollowUpDate,
        followUpStatus,
        orderStatus,
        nextFollowUpDate,
        nextAction,
        remarks: remarks || `Status updated to ${followUpStatus}`,
        updatedBy: updatedBy || null,
      },
    });

    // 2. Update quotation follow-up status without altering core quotation items
    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        followUpStatus,
        orderStatus,
        lastFollowUpDate,
        nextFollowUpDate,
        nextAction,
        followUpRemarks: remarks || quotation.followUpRemarks,
      },
      include: {
        followUps: {
          orderBy: { followUpDate: "desc" },
        },
      },
    });

    return NextResponse.json(serializeQuotation(updated));
  } catch (error) {
    console.error("POST /api/quotations/[id]/follow-up:", error);
    return NextResponse.json({ error: "Failed to record follow-up" }, { status: 500 });
  }
}
