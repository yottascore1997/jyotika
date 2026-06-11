import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MAX_PO_IMAGES, deletePoImageFile, savePoImageFile } from "@/lib/po-images";
import { serializeEntityImage } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const poId = Number(params.id);
    if (isNaN(poId)) {
      return NextResponse.json({ error: "Invalid PO ID" }, { status: 400 });
    }

    const po = await prisma.pOMaster.findUnique({
      where: { id: poId },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (!files.length) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    if (po.images.length + files.length > MAX_PO_IMAGES) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_PO_IMAGES} images per PO` },
        { status: 400 }
      );
    }

    const created = [];
    let sortOrder = po.images.length;

    for (const file of files) {
      const saved = await savePoImageFile(file, po.poId);
      const image = await prisma.pOImage.create({
        data: {
          poMasterId: poId,
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
    console.error("POST /api/po/[id]/images:", error);
    const message = error instanceof Error ? error.message : "Failed to upload images";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const poId = Number(params.id);
    if (isNaN(poId)) {
      return NextResponse.json({ error: "Invalid PO ID" }, { status: 400 });
    }

    const imageId = Number(request.nextUrl.searchParams.get("imageId"));
    if (isNaN(imageId)) {
      return NextResponse.json({ error: "imageId is required" }, { status: 400 });
    }

    const image = await prisma.pOImage.findFirst({
      where: { id: imageId, poMasterId: poId },
    });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await deletePoImageFile(image.filePath);
    await prisma.pOImage.delete({ where: { id: imageId } });

    return NextResponse.json({ message: "Image deleted" });
  } catch (error) {
    console.error("DELETE /api/po/[id]/images:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
