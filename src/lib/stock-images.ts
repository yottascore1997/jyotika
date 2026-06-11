import {
  MAX_ENTITY_IMAGES,
  deleteEntityImageFile,
  ensureUploadDir,
  getUploadDir,
  saveEntityImageFile,
  toPublicImagePath,
  validateImageFile,
} from "@/lib/entity-images";

export const MAX_STOCK_IMAGES = MAX_ENTITY_IMAGES;
export const STOCK_UPLOAD_DIR = getUploadDir("stock");
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export async function ensureStockUploadDir() {
  await ensureUploadDir("stock");
}

export { toPublicImagePath, validateImageFile };

export async function saveStockImageFile(file: File, stockCode: string) {
  return saveEntityImageFile(file, "stock", stockCode);
}

export async function deleteStockImageFile(filePath: string) {
  return deleteEntityImageFile(filePath);
}
