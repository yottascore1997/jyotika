import fs from "fs/promises";
import path from "path";

export const MAX_ENTITY_IMAGES = 3;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export type ImageEntity = "stock" | "po" | "tender";

export function getUploadDir(entity: ImageEntity) {
  return path.join(process.cwd(), "public", "uploads", entity);
}

export async function ensureUploadDir(entity: ImageEntity) {
  await fs.mkdir(getUploadDir(entity), { recursive: true });
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

export async function saveEntityImageFile(file: File, entity: ImageEntity, code: string) {
  validateImageFile(file);
  await ensureUploadDir(entity);

  const ext = path.extname(file.name) || ".jpg";
  const safeName = `${code}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const diskPath = path.join(getUploadDir(entity), safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(diskPath, buffer);

  return {
    filePath: `/uploads/${entity}/${safeName}`,
    fileName: file.name,
  };
}

export async function deleteEntityImageFile(filePath: string) {
  const relative = filePath.replace(/^\//, "");
  const fullPath = path.join(process.cwd(), "public", relative);
  try {
    await fs.unlink(fullPath);
  } catch {
    // File may already be missing.
  }
}
