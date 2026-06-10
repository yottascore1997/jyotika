"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";

export const MAX_STOCK_IMAGES = 3;

export type StockImageRecord = {
  id: number;
  url: string;
  fileName: string;
};

export type PendingStockImage = {
  file: File;
  preview: string;
};

type Props = {
  existing: StockImageRecord[];
  pending: PendingStockImage[];
  removedIds: number[];
  onAdd: (files: File[]) => void;
  onRemoveExisting: (id: number) => void;
  onRemovePending: (index: number) => void;
};

export default function StockImageUpload({
  existing,
  pending,
  removedIds,
  onAdd,
  onRemoveExisting,
  onRemovePending,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleExisting = existing.filter((image) => !removedIds.includes(image.id));
  const total = visibleExisting.length + pending.length;
  const canAddMore = total < MAX_STOCK_IMAGES;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;

    const remaining = MAX_STOCK_IMAGES - total;
    if (remaining <= 0) {
      alert(`You can upload up to ${MAX_STOCK_IMAGES} photos only`);
      return;
    }

    onAdd(selected.slice(0, remaining));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="label-field">Photos (optional, max {MAX_STOCK_IMAGES})</label>
        <span className="text-xs text-slate-500">{total}/{MAX_STOCK_IMAGES}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {visibleExisting.map((image) => (
          <div key={image.id} className="relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <img src={image.url} alt={image.fileName} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveExisting(image.id)}
              className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-rose-500 shadow hover:bg-white"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {pending.map((image, index) => (
          <div key={`${image.file.name}-${index}`} className="relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <img src={image.preview} alt={image.file.name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemovePending(index)}
              className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-rose-500 shadow hover:bg-white"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:text-blue-600"
          >
            <ImagePlus size={20} />
            <span className="text-xs">Add Photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <p className="mt-2 text-xs text-slate-500">JPG, PNG, WEBP, or GIF. Max 5 MB each.</p>
    </div>
  );
}
