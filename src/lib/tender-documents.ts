import fs from "fs/promises";
import path from "path";

export const TENDER_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "tender");
export const MAX_TENDER_ZIP_BYTES = 25 * 1024 * 1024;
export const MAX_TENDER_DOC_BYTES = 5 * 1024 * 1024;

export const TENDER_DOC_TYPES = ["zip", "tender_bid", "technical_spec"] as const;
export type TenderDocType = (typeof TENDER_DOC_TYPES)[number];

const ZIP_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

const DOC_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

export async function ensureTenderUploadDir() {
  await fs.mkdir(TENDER_UPLOAD_DIR, { recursive: true });
}

export function toPublicDocPath(filePath: string) {
  return filePath.startsWith("/") ? filePath : `/${filePath}`;
}

export function validateTenderDocument(file: File, docType: TenderDocType) {
  const isZip = docType === "zip";
  const allowed = isZip ? ZIP_TYPES : DOC_TYPES;
  const maxSize = isZip ? MAX_TENDER_ZIP_BYTES : MAX_TENDER_DOC_BYTES;

  if (!allowed.has(file.type) && !file.name.toLowerCase().endsWith(".zip")) {
    throw new Error(
      isZip
        ? "Only ZIP files are allowed (max 25 MB)"
        : "Allowed: PDF, Word, Excel, or ZIP (max 5 MB)"
    );
  }
  if (file.size > maxSize) {
    throw new Error(isZip ? "ZIP file must be 25 MB or smaller" : "File must be 5 MB or smaller");
  }
}

export async function saveTenderDocumentFile(file: File, tenderCode: string, docType: TenderDocType) {
  validateTenderDocument(file, docType);
  await ensureTenderUploadDir();

  const ext = path.extname(file.name) || (docType === "zip" ? ".zip" : ".pdf");
  const safeName = `${tenderCode}_${docType}_${Date.now()}${ext}`;
  const diskPath = path.join(TENDER_UPLOAD_DIR, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(diskPath, buffer);

  return {
    filePath: `/uploads/tender/${safeName}`,
    fileName: file.name,
    fileSize: file.size,
  };
}

export async function deleteTenderDocumentFile(filePath: string) {
  const relative = filePath.replace(/^\//, "");
  const fullPath = path.join(process.cwd(), "public", relative);
  try {
    await fs.unlink(fullPath);
  } catch {
    // File may already be missing.
  }
}
