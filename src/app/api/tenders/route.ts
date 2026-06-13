import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeTender } from "@/lib/serializers";

export async function GET() {
  try {
    const rows = await prisma.tender.findMany({
      orderBy: { tenderSubmittedDate: "desc" },
      include: { documents: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json(rows.map(serializeTender));
  } catch (error) {
    console.error("GET /api/tenders:", error);
    return NextResponse.json({ error: "Failed to fetch tenders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.organizationName || !body.tenderBidNo || !body.quotedProduct) {
      return NextResponse.json(
        { error: "Organization name, tender bid no, and quoted product are required" },
        { status: 400 }
      );
    }

    const tender = await prisma.tender.create({
      data: {
        organizationName: body.organizationName,
        location: body.location || "",
        tenderBidNo: body.tenderBidNo,
        tenderSubmittedDate: body.tenderSubmittedDate
          ? new Date(body.tenderSubmittedDate)
          : new Date(),
        quotedProduct: body.quotedProduct,
        orderValue: Number(body.orderValue) || 0,
        status: body.status || "Tender Filled Up",
        statusAsOnDate: body.statusAsOnDate || "",
        fixedRa: body.fixedRa || "No",
        miiPreference: body.miiPreference || "No",
        tenderType: body.tenderType || "Standard",
      },
      include: { documents: true },
    });

    return NextResponse.json(serializeTender(tender), { status: 201 });
  } catch (error) {
    console.error("POST /api/tenders:", error);
    return NextResponse.json({ error: "Failed to create tender" }, { status: 500 });
  }
}
