import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildSetHistory, setHistoryInclude } from "@/lib/set-history";

type Params = { params: { setId: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const query = decodeURIComponent(params.setId).trim();
    if (!query) {
      return NextResponse.json({ error: "Set ID or serial is required" }, { status: 400 });
    }

    const stockSet =
      (await prisma.stockSet.findUnique({
        where: { setId: query },
        include: setHistoryInclude,
      })) ||
      (await prisma.stockSet.findUnique({
        where: { mainSerialNumber: query },
        include: setHistoryInclude,
      }));

    if (!stockSet) {
      return NextResponse.json({ error: `Set ${query} not found` }, { status: 404 });
    }

    return NextResponse.json(buildSetHistory(stockSet));
  } catch (error) {
    console.error("GET /api/services/history/set/[setId]:", error);
    return NextResponse.json({ error: "Failed to fetch set history" }, { status: 500 });
  }
}
