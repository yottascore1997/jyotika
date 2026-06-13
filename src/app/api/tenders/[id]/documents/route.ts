import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  TENDER_DOC_TYPES,
  type TenderDocType,
  deleteTenderDocumentFile,
  saveTenderDocumentFile,
} from "@/lib/tender-documents";
import { serializeTenderDocument } from "@/lib/serializers";

type Params = { params: { id: string } };

function isValidDocType(value: string): value is TenderDocType {
  return (TENDER_DOC_TYPES as readonly string[]).includes(value);
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const tenderId = Number(params.id);
    if (isNaN(tenderId)) {
      return NextResponse.json({ error: "Invalid tender ID" }, { status: 400 });
    }

    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
      include: { documents: true },
    });
    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const docType = String(formData.get("docType") || "");
    const file = formData.get("file");

    if (!isValidDocType(docType)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (docType === "zip") {
      const separate = tender.documents.filter((d) => d.docType !== "zip");
      for (const doc of separate) {
        await deleteTenderDocumentFile(doc.filePath);
        await prisma.tenderDocument.delete({ where: { id: doc.id } });
      }
    } else {
      const zipDoc = tender.documents.find((d) => d.docType === "zip");
      if (zipDoc) {
        await deleteTenderDocumentFile(zipDoc.filePath);
        await prisma.tenderDocument.delete({ where: { id: zipDoc.id } });
      }
    }

    const saved = await saveTenderDocumentFile(file, tender.tenderBidNo, docType);
    const existing = tender.documents.find((d) => d.docType === docType);
    if (existing) {
      await deleteTenderDocumentFile(existing.filePath);
      await prisma.tenderDocument.delete({ where: { id: existing.id } });
    }

    const document = await prisma.tenderDocument.create({
      data: {
        tenderId,
        docType,
        filePath: saved.filePath,
        fileName: saved.fileName,
        fileSize: saved.fileSize,
      },
    });

    return NextResponse.json(serializeTenderDocument(document), { status: 201 });
  } catch (error) {
    console.error("POST /api/tenders/[id]/documents:", error);
    const message = error instanceof Error ? error.message : "Failed to upload document";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const tenderId = Number(params.id);
    if (isNaN(tenderId)) {
      return NextResponse.json({ error: "Invalid tender ID" }, { status: 400 });
    }

    const documentId = Number(request.nextUrl.searchParams.get("documentId"));
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const document = await prisma.tenderDocument.findFirst({
      where: { id: documentId, tenderId },
    });
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await deleteTenderDocumentFile(document.filePath);
    await prisma.tenderDocument.delete({ where: { id: documentId } });

    return NextResponse.json({ message: "Document deleted" });
  } catch (error) {
    console.error("DELETE /api/tenders/[id]/documents:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
