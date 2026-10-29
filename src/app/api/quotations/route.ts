import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeQuotation } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const salesEngineer = searchParams.get("salesEngineer")?.trim();
    const orderStatus = searchParams.get("orderStatus")?.trim();
    const followUpStatus = searchParams.get("followUpStatus")?.trim();
    const region = searchParams.get("region")?.trim();
    const filterDue = searchParams.get("filterDue")?.trim(); // "overdue" | "dueToday"

    const where: any = {};

    if (search) {
      where.OR = [
        { quotationNumber: { contains: search } },
        { customerName: { contains: search } },
        { companyName: { contains: search } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search } },
        { productModel: { contains: search } },
        { salesEngineer: { contains: search } },
        { region: { contains: search } },
        { location: { contains: search } },
        { quotationMadeBy: { contains: search } },
      ];
    }

    if (salesEngineer && salesEngineer !== "All") {
      where.salesEngineer = salesEngineer;
    }

    if (orderStatus && orderStatus !== "All") {
      where.orderStatus = orderStatus;
    }

    if (followUpStatus && followUpStatus !== "All") {
      where.followUpStatus = followUpStatus;
    }

    if (region && region !== "All") {
      where.region = region;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (filterDue === "overdue") {
      where.orderStatus = "Open";
      where.nextFollowUpDate = {
        lt: startOfToday,
      };
    } else if (filterDue === "dueToday") {
      where.orderStatus = "Open";
      where.nextFollowUpDate = {
        gte: startOfToday,
        lte: endOfToday,
      };
    }

    const quotations = await prisma.quotation.findMany({
      where,
      orderBy: { quotationDate: "desc" },
      include: {
        followUps: {
          orderBy: { followUpDate: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json(quotations.map(serializeQuotation));
  } catch (error) {
    console.error("GET /api/quotations:", error);
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const quotationNumber = String(body.quotationNumber || "").trim();
    const customerName = String(body.customerName || "").trim();
    const companyName = body.companyName ? String(body.companyName).trim() : null;
    const customerPhone = body.customerPhone ? String(body.customerPhone).trim() : null;
    const customerEmail = body.customerEmail ? String(body.customerEmail).trim() : null;
    const salesEngineer = String(body.salesEngineer || "").trim();
    const productModel = String(body.productModel || "").trim();

    if (!quotationNumber) {
      return NextResponse.json({ error: "Quotation Number is required" }, { status: 400 });
    }
    if (!customerName) {
      return NextResponse.json({ error: "Customer Name is required" }, { status: 400 });
    }
    if (!salesEngineer) {
      return NextResponse.json({ error: "Sales Engineer is required" }, { status: 400 });
    }
    if (!productModel) {
      return NextResponse.json({ error: "Product / Model is required" }, { status: 400 });
    }

    // Check duplicate quotation number
    const existing = await prisma.quotation.findFirst({
      where: { quotationNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Quotation Number "${quotationNumber}" already exists. Please use a unique number.` },
        { status: 409 }
      );
    }

    const quotationDate = body.quotationDate ? new Date(body.quotationDate) : new Date();
    const quotationAmount = body.quotationAmount !== undefined && body.quotationAmount !== "" ? Number(body.quotationAmount) : 0;
    const discountAmount = body.discountAmount !== undefined && body.discountAmount !== "" ? Number(body.discountAmount) : 0;
    const poAmount = body.poAmount !== undefined && body.poAmount !== "" ? Number(body.poAmount) : 0;
    const region = body.region ? String(body.region).trim() : null;
    const location = body.location ? String(body.location).trim() : null;
    const quotationMadeBy = body.quotationMadeBy ? String(body.quotationMadeBy).trim() : null;
    const customerContact = body.customerContact
      ? String(body.customerContact).trim()
      : [customerPhone, customerEmail].filter(Boolean).join(" | ") || null;
    const orderStatus = body.orderStatus || "Open";
    const followUpStatus = body.followUpStatus || "Not Started";
    const nextFollowUpDate = body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : null;
    const lastFollowUpDate = body.lastFollowUpDate ? new Date(body.lastFollowUpDate) : null;
    const nextAction = body.nextAction ? String(body.nextAction).trim() : null;
    const followUpRemarks = body.followUpRemarks ? String(body.followUpRemarks).trim() : null;

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        quotationDate,
        customerName,
        companyName,
        customerPhone,
        customerEmail,
        customerContact,
        salesEngineer,
        productModel,
        quotationAmount,
        discountAmount,
        poAmount,
        region,
        location,
        quotationMadeBy,
        orderStatus,
        followUpStatus,
        lastFollowUpDate,
        nextFollowUpDate,
        nextAction,
        followUpRemarks,
        followUps: followUpRemarks
          ? {
              create: [
                {
                  followUpDate: lastFollowUpDate || new Date(),
                  followUpStatus,
                  orderStatus,
                  nextFollowUpDate,
                  nextAction,
                  remarks: followUpRemarks,
                  updatedBy: quotationMadeBy || salesEngineer,
                },
              ],
            }
          : undefined,
      },
      include: {
        followUps: true,
      },
    });

    return NextResponse.json(serializeQuotation(quotation), { status: 201 });
  } catch (error) {
    console.error("POST /api/quotations:", error);
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  }
}
