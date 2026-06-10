import fs from "fs/promises";
import path from "path";

export const MAX_STOCK_IMAGES = 3;
export const STOCK_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "stock");
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export async function ensureStockUploadDir() {
  await fs.mkdir(STOCK_UPLOAD_DIR, { recursive: true });
}

export function toPublicImagePath(filePath: string) {
  return filePath.startsWith("/") ? filePath : `/${filePath}`;
}

export function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, and GIF images are allowed");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Each image must be 5 MB or smaller");
  }
}

export async function saveStockImageFile(file: File, stockCode: string) {
  validateImageFile(file);
  await ensureStockUploadDir();

  const ext = path.extname(file.name) || ".jpg";
  const safeName = `${stockCode}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const diskPath = path.join(STOCK_UPLOAD_DIR, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(diskPath, buffer);

  return {
    filePath: `/uploads/stock/${safeName}`,
    fileName: file.name,
  };
}

export async function deleteStockImageFile(filePath: string) {
  const relative = filePath.replace(/^\//, "");
  const fullPath = path.join(process.cwd(), "public", relative);
  try {
    await fs.unlink(fullPath);
  } catch {
    // File may already be missing.
  }
}
