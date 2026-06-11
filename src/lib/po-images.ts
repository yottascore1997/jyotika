import {
  MAX_ENTITY_IMAGES,
  deleteEntityImageFile,
  ensureUploadDir,
  saveEntityImageFile,
} from "@/lib/entity-images";

export const MAX_PO_IMAGES = MAX_ENTITY_IMAGES;

export async function ensurePoUploadDir() {
  await ensureUploadDir("po");
}

export async function savePoImageFile(file: File, poCode: string) {
  return saveEntityImageFile(file, "po", poCode);
}

export async function deletePoImageFile(filePath: string) {
  return deleteEntityImageFile(filePath);
}
