import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createStockSet } from "@/lib/stock-set-service";
import { serializeStockSet } from "@/lib/serializers";

export async function GET() {
  try {
    const sets = await prisma.stockSet.findMany({
      include: {
        items: {
          orderBy: { id: "asc" },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(sets.map(serializeStockSet));
  } catch (error) {
    console.error("GET /api/stock/sets:", error);
    return NextResponse.json({ error: "Failed to fetch stock sets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createStockSet(body);
    const full = await prisma.stockSet.findUnique({
      where: { id: result.stockSet.id },
      include: { items: true },
    });
    return NextResponse.json(serializeStockSet(full!), { status: 201 });
  } catch (error) {
    console.error("POST /api/stock/sets:", error);
    const message = error instanceof Error ? error.message : "Failed to create stock set";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
