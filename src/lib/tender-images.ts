import {
  MAX_ENTITY_IMAGES,
  deleteEntityImageFile,
  ensureUploadDir,
  saveEntityImageFile,
} from "@/lib/entity-images";

export const MAX_TENDER_IMAGES = MAX_ENTITY_IMAGES;

export async function ensureTenderUploadDir() {
  await ensureUploadDir("tender");
}

export async function saveTenderImageFile(file: File, tenderCode: string) {
  return saveEntityImageFile(file, "tender", tenderCode);
}

export async function deleteTenderImageFile(filePath: string) {
  return deleteEntityImageFile(filePath);
}
