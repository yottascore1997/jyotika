import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  MAX_STOCK_IMAGES,
  deleteStockImageFile,
  saveStockImageFile,
  toPublicImagePath,
} from "@/lib/stock-images";

type Params = { params: { id: string } };

function serializeImage(image: {
  id: number;
  filePath: string;
  fileName: string;
  sortOrder: number;
  createdAt: Date;
}) {
  return {
    id: image.id,
    url: toPublicImagePath(image.filePath),
    fileName: image.fileName,
    sortOrder: image.sortOrder,
    createdAt: image.createdAt.toISOString(),
  };
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const stockId = Number(params.id);
    if (isNaN(stockId)) {
      return NextResponse.json({ error: "Invalid stock ID" }, { status: 400 });
    }

    const stock = await prisma.stockMaster.findUnique({
      where: { id: stockId },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (!files.length) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    if (stock.images.length + files.length > MAX_STOCK_IMAGES) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_STOCK_IMAGES} images per stock item` },
        { status: 400 }
      );
    }

    const created = [];
    let sortOrder = stock.images.length;

    for (const file of files) {
      const saved = await saveStockImageFile(file, stock.stockId);
      const image = await prisma.stockImage.create({
        data: {
          stockMasterId: stockId,
          filePath: saved.filePath,
          fileName: saved.fileName,
          sortOrder,
        },
      });
      created.push(image);
      sortOrder += 1;
    }

    return NextResponse.json(created.map(serializeImage), { status: 201 });
  } catch (error) {
    console.error("POST /api/stock/[id]/images:", error);
    const message = error instanceof Error ? error.message : "Failed to upload images";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const stockId = Number(params.id);
    if (isNaN(stockId)) {
      return NextResponse.json({ error: "Invalid stock ID" }, { status: 400 });
    }

    const imageId = Number(request.nextUrl.searchParams.get("imageId"));
    if (isNaN(imageId)) {
      return NextResponse.json({ error: "imageId is required" }, { status: 400 });
    }

    const image = await prisma.stockImage.findFirst({
      where: { id: imageId, stockMasterId: stockId },
    });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await deleteStockImageFile(image.filePath);
    await prisma.stockImage.delete({ where: { id: imageId } });

    return NextResponse.json({ message: "Image deleted" });
  } catch (error) {
    console.error("DELETE /api/stock/[id]/images:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
