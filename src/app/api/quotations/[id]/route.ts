import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeQuotation } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Invalid quotation ID" }, { status: 400 });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        followUps: {
          orderBy: { followUpDate: "desc" },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json(serializeQuotation(quotation));
  } catch (error) {
    console.error("GET /api/quotations/[id]:", error);
    return NextResponse.json({ error: "Failed to fetch quotation" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Invalid quotation ID" }, { status: 400 });
    }

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const body = await request.json();
    const quotationNumber =
      body.quotationNumber !== undefined
        ? String(body.quotationNumber).trim()
        : existing.quotationNumber;

    if (!quotationNumber) {
      return NextResponse.json({ error: "Quotation Number is required" }, { status: 400 });
    }

    if (quotationNumber !== existing.quotationNumber) {
      const duplicate = await prisma.quotation.findFirst({
        where: { quotationNumber },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Quotation Number "${quotationNumber}" already exists` },
          { status: 409 }
        );
      }
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        quotationNumber,
        quotationDate: body.quotationDate ? new Date(body.quotationDate) : existing.quotationDate,
        customerName:
          body.customerName !== undefined ? String(body.customerName).trim() : existing.customerName,
        companyName:
          body.companyName !== undefined ? (body.companyName ? String(body.companyName).trim() : null) : existing.companyName,
        customerPhone:
          body.customerPhone !== undefined ? (body.customerPhone ? String(body.customerPhone).trim() : null) : existing.customerPhone,
        customerEmail:
          body.customerEmail !== undefined ? (body.customerEmail ? String(body.customerEmail).trim() : null) : existing.customerEmail,
        salesEngineer:
          body.salesEngineer !== undefined
            ? String(body.salesEngineer).trim()
            : existing.salesEngineer,
        customerContact:
          body.customerContact !== undefined
            ? String(body.customerContact).trim()
            : existing.customerContact,
        productModel:
          body.productModel !== undefined ? String(body.productModel).trim() : existing.productModel,
        quotationAmount:
          body.quotationAmount !== undefined
            ? Number(body.quotationAmount)
            : existing.quotationAmount,
        discountAmount:
          body.discountAmount !== undefined
            ? (body.discountAmount === "" ? 0 : Number(body.discountAmount))
            : existing.discountAmount,
        poAmount:
          body.poAmount !== undefined
            ? (body.poAmount === "" ? 0 : Number(body.poAmount))
            : existing.poAmount,
        region: body.region !== undefined ? String(body.region).trim() : existing.region,
        location: body.location !== undefined ? String(body.location).trim() : existing.location,
        quotationMadeBy:
          body.quotationMadeBy !== undefined
            ? String(body.quotationMadeBy).trim()
            : existing.quotationMadeBy,
        orderStatus: body.orderStatus ?? existing.orderStatus,
        followUpStatus: body.followUpStatus ?? existing.followUpStatus,
        lastFollowUpDate:
          body.lastFollowUpDate !== undefined
            ? body.lastFollowUpDate
              ? new Date(body.lastFollowUpDate)
              : null
            : existing.lastFollowUpDate,
        nextFollowUpDate:
          body.nextFollowUpDate !== undefined
            ? body.nextFollowUpDate
              ? new Date(body.nextFollowUpDate)
              : null
            : existing.nextFollowUpDate,
        nextAction:
          body.nextAction !== undefined ? String(body.nextAction).trim() : existing.nextAction,
        followUpRemarks:
          body.followUpRemarks !== undefined
            ? String(body.followUpRemarks).trim()
            : existing.followUpRemarks,
      },
      include: {
        followUps: {
          orderBy: { followUpDate: "desc" },
        },
      },
    });

    return NextResponse.json(serializeQuotation(quotation));
  } catch (error) {
    console.error("PUT /api/quotations/[id]:", error);
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const id = Number(params.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Invalid quotation ID" }, { status: 400 });
    }

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    await prisma.quotation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/quotations/[id]:", error);
    return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 });
  }
}
