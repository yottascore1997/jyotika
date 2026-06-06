import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeMovement } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get("serialNumber");

    const movements = await prisma.stockMovement.findMany({
      where: serialNumber ? { serialNumber } : undefined,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(movements.map(serializeMovement));
  } catch (error) {
    console.error("GET /api/movements:", error);
    return NextResponse.json({ error: "Failed to fetch movements" }, { status: 500 });
  }
}
