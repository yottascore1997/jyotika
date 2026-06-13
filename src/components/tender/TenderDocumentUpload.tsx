"use client";

import { useRef } from "react";
import { FileArchive, FileText, Upload, X } from "lucide-react";
import type { TenderDocType } from "@/lib/tender-documents";

export type TenderDocumentRecord = {
  id: number;
  docType: string;
  url: string;
  fileName: string;
  fileSize: number;
};

export type PendingTenderDocument = {
  docType: TenderDocType;
  file: File;
};

const DOC_LABELS: Record<TenderDocType, string> = {
  zip: "Tender Document (ZIP)",
  tender_bid: "Tender Bid File",
  technical_spec: "Technical Spec File",
};

type Props = {
  existing: TenderDocumentRecord[];
  pending: PendingTenderDocument[];
  removedIds: number[];
  onAdd: (docType: TenderDocType, file: File) => void;
  onRemoveExisting: (id: number) => void;
  onRemovePending: (docType: TenderDocType) => void;
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TenderDocumentUpload({
  existing,
  pending,
  removedIds,
  onAdd,
  onRemoveExisting,
  onRemovePending,
}: Props) {
  const zipRef = useRef<HTMLInputElement>(null);
  const bidRef = useRef<HTMLInputElement>(null);
  const specRef = useRef<HTMLInputElement>(null);

  const visibleExisting = existing.filter((doc) => !removedIds.includes(doc.id));
  const hasZip =
    visibleExisting.some((d) => d.docType === "zip") || pending.some((d) => d.docType === "zip");
  const hasSeparate =
    visibleExisting.some((d) => d.docType !== "zip") || pending.some((d) => d.docType !== "zip");

  const getExisting = (docType: TenderDocType) => visibleExisting.find((d) => d.docType === docType);
  const getPending = (docType: TenderDocType) => pending.find((d) => d.docType === docType);

  const handleFile = (docType: TenderDocType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onAdd(docType, file);
  };

  const renderDocRow = (docType: TenderDocType, maxLabel: string) => {
    const existingDoc = getExisting(docType);
    const pendingDoc = getPending(docType);

    return (
      <div key={docType} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700">{DOC_LABELS[docType]}</label>
          <span className="text-xs text-slate-500">{maxLabel}</span>
        </div>

        {existingDoc ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
            <a
              href={existingDoc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
            >
              {docType === "zip" ? <FileArchive size={16} /> : <FileText size={16} />}
              <span className="truncate">{existingDoc.fileName}</span>
              <span className="shrink-0 text-xs text-slate-500">({formatSize(existingDoc.fileSize)})</span>
            </a>
            <button
              type="button"
              onClick={() => onRemoveExisting(existingDoc.id)}
              className="rounded p-1 text-rose-500 hover:bg-rose-50"
            >
              <X size={14} />
            </button>
          </div>
        ) : pendingDoc ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
              {docType === "zip" ? <FileArchive size={16} /> : <FileText size={16} />}
              <span className="truncate">{pendingDoc.file.name}</span>
              <span className="shrink-0 text-xs text-slate-500">({formatSize(pendingDoc.file.size)})</span>
            </div>
            <button
              type="button"
              onClick={() => onRemovePending(docType)}
              className="rounded p-1 text-rose-500 hover:bg-rose-50"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (docType === "zip") zipRef.current?.click();
              else if (docType === "tender_bid") bidRef.current?.click();
              else specRef.current?.click();
            }}
            disabled={(docType === "zip" && hasSeparate) || (docType !== "zip" && hasZip)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={16} />
            Upload {DOC_LABELS[docType]}
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-700">Tender Documents (optional)</p>
      <p className="mb-4 text-xs text-slate-500">
        Upload one ZIP file (max 25 MB) <strong>or</strong> separate Tender Bid + Technical Spec files (max 5 MB each).
      </p>

      <div className="space-y-3">
        {renderDocRow("zip", "Max 25 MB")}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {renderDocRow("tender_bid", "Max 5 MB")}
          {renderDocRow("technical_spec", "Max 5 MB")}
        </div>
      </div>

      <input ref={zipRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => handleFile("zip", e)} />
      <input ref={bidRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" className="hidden" onChange={(e) => handleFile("tender_bid", e)} />
      <input ref={specRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" className="hidden" onChange={(e) => handleFile("technical_spec", e)} />
    </div>
  );
}
