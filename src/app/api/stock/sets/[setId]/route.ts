import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeStockSet } from "@/lib/serializers";
import { deleteStockImageFile } from "@/lib/stock-images";

type Params = { params: { setId: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const setId = decodeURIComponent(params.setId);
    const stockSet = await prisma.stockSet.findUnique({
      where: { setId },
      include: {
        items: {
          orderBy: { id: "asc" },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!stockSet) {
      return NextResponse.json({ error: `Set ${setId} not found` }, { status: 404 });
    }

    return NextResponse.json(serializeStockSet(stockSet));
  } catch (error) {
    console.error("GET /api/stock/sets/[setId]:", error);
    return NextResponse.json({ error: "Failed to fetch stock set" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const setId = decodeURIComponent(params.setId);
    const stockSet = await prisma.stockSet.findUnique({
      where: { setId },
      include: { items: { include: { images: true } } },
    });

    if (!stockSet) {
      return NextResponse.json({ error: `Set ${setId} not found` }, { status: 404 });
    }

    await Promise.all(
      stockSet.items.flatMap((item) => item.images.map((image) => deleteStockImageFile(image.filePath)))
    );

    await prisma.$transaction(async (tx) => {
      for (const item of stockSet.items) {
        await tx.stockMovement.deleteMany({ where: { stockMasterId: item.id } });
        await tx.materialIssue.deleteMany({ where: { stockMasterId: item.id } });
        await tx.demoTracking.deleteMany({ where: { stockMasterId: item.id } });
        await tx.customerHandover.deleteMany({ where: { stockMasterId: item.id } });
        await tx.repairCase.deleteMany({ where: { stockMasterId: item.id } });
        await tx.oEMReturn.deleteMany({ where: { stockMasterId: item.id } });
        await tx.assetSale.deleteMany({ where: { stockMasterId: item.id } });
        await tx.materialReceipt.deleteMany({ where: { stockMasterId: item.id } });
      }
      await tx.stockSet.delete({ where: { id: stockSet.id } });
    });

    return NextResponse.json({ message: "Stock set deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/stock/sets/[setId]:", error);
    return NextResponse.json({ error: "Failed to delete stock set" }, { status: 500 });
  }
}
