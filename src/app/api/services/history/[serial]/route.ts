import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildServiceHistory, getDisplayStatus } from "@/lib/service-history";
import { buildSetHistory, setHistoryInclude } from "@/lib/set-history";
import { serializeStock } from "@/lib/serializers";

type Params = { params: { serial: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const serialNumber = decodeURIComponent(params.serial).trim();
    if (!serialNumber) {
      return NextResponse.json({ error: "Serial number is required" }, { status: 400 });
    }

    const stockSetByMain = await prisma.stockSet.findUnique({
      where: { mainSerialNumber: serialNumber },
      include: setHistoryInclude,
    });
    if (stockSetByMain) {
      return NextResponse.json(buildSetHistory(stockSetByMain));
    }

    const stock = await prisma.stockMaster.findUnique({
      where: { serialNumber },
      include: {
        stockSet: { include: setHistoryInclude },
        receipt: true,
        issues: { orderBy: { issueDate: "asc" } },
        demos: { orderBy: { issueDate: "asc" } },
        handovers: { orderBy: { handoverDate: "asc" } },
        repairs: { orderBy: { receivedDate: "asc" } },
        oemReturns: { orderBy: { returnDate: "asc" } },
        sales: { orderBy: { saleDate: "asc" } },
        poAllocations: {
          include: { poMaster: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!stock) {
      const stockSetById = await prisma.stockSet.findUnique({
        where: { setId: serialNumber },
        include: setHistoryInclude,
      });
      if (stockSetById) {
        return NextResponse.json(buildSetHistory(stockSetById));
      }

      return NextResponse.json(
        { error: `No stock or set found for serial number ${serialNumber}` },
        { status: 404 }
      );
    }

    if (stock.stockSet) {
      return NextResponse.json(buildSetHistory(stock.stockSet));
    }

    const history = buildServiceHistory(stock);
    const displayStatus = getDisplayStatus(stock);

    return NextResponse.json({
      stock: serializeStock(stock),
      history,
      displayStatus,
      totalEvents: history.length,
      searchMode: "serial" as const,
    });
  } catch (error) {
    console.error("GET /api/services/history/[serial]:", error);
    return NextResponse.json({ error: "Failed to fetch service history" }, { status: 500 });
  }
}
