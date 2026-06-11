import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MAX_TENDER_IMAGES, deleteTenderImageFile, saveTenderImageFile } from "@/lib/tender-images";
import { serializeEntityImage } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const tenderId = Number(params.id);
    if (isNaN(tenderId)) {
      return NextResponse.json({ error: "Invalid tender ID" }, { status: 400 });
    }

    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (!files.length) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    if (tender.images.length + files.length > MAX_TENDER_IMAGES) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_TENDER_IMAGES} images per tender` },
        { status: 400 }
      );
    }

    const created = [];
    let sortOrder = tender.images.length;

    for (const file of files) {
      const saved = await saveTenderImageFile(file, tender.tenderBidNo);
      const image = await prisma.tenderImage.create({
        data: {
          tenderId,
          filePath: saved.filePath,
          fileName: saved.fileName,
          sortOrder,
        },
      });
      created.push(image);
      sortOrder += 1;
    }

    return NextResponse.json(created.map(serializeEntityImage), { status: 201 });
  } catch (error) {
    console.error("POST /api/tenders/[id]/images:", error);
    const message = error instanceof Error ? error.message : "Failed to upload images";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const tenderId = Number(params.id);
    if (isNaN(tenderId)) {
      return NextResponse.json({ error: "Invalid tender ID" }, { status: 400 });
    }

    const imageId = Number(request.nextUrl.searchParams.get("imageId"));
    if (isNaN(imageId)) {
      return NextResponse.json({ error: "imageId is required" }, { status: 400 });
    }

    const image = await prisma.tenderImage.findFirst({
      where: { id: imageId, tenderId },
    });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await deleteTenderImageFile(image.filePath);
    await prisma.tenderImage.delete({ where: { id: imageId } });

    return NextResponse.json({ message: "Image deleted" });
  } catch (error) {
    console.error("DELETE /api/tenders/[id]/images:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
