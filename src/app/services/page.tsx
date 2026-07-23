"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

type StockInfo = {
  stockId?: string;
  serialNumber?: string;
  modelNumber: string;
  make?: string;
  currentStatus: string;
};

type SetInfo = {
  setId: string;
  mainSerialNumber: string;
  modelNumber: string;
  make?: string;
  currentStatus: string;
  items?: Array<{ serialNumber: string; partRole?: string }>;
};

type HistoryEntry = {
  date: string;
  activity: string;
  details: string;
  reference: string;
  party: string;
  category: string;
  status: string;
};

function ServicesContent() {
  const params = useSearchParams();
  const [serial, setSerial] = useState(params.get("serial") || "");
  const [stockList, setStockList] = useState<Array<{ serialNumber: string; modelNumber: string; label?: string }>>([]);
  const [stock, setStock] = useState<StockInfo | null>(null);
  const [setInfo, setSetInfo] = useState<SetInfo | null>(null);
  const [searchMode, setSearchMode] = useState<"serial" | "set">("serial");
  const [displayStatus, setDisplayStatus] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const PREVIEW_ROWS = 6;

  useEffect(() => {
    Promise.all([
      fetch("/api/stock?view=all").then((r) => r.json()),
      fetch("/api/stock/sets").then((r) => r.json()),
    ]).then(([stockData, setsData]) => {
      const suggestions: Array<{ serialNumber: string; modelNumber: string; label?: string }> = [];
      if (Array.isArray(stockData)) {
        for (const s of stockData) {
          suggestions.push({ serialNumber: s.serialNumber, modelNumber: s.modelNumber });
        }
      }
      if (Array.isArray(setsData)) {
        for (const s of setsData) {
          suggestions.push({
            serialNumber: s.mainSerialNumber || s.setId,
            modelNumber: s.modelNumber,
            label: `Set (${s.items?.length || 0} items)`,
          });
        }
      }
      setStockList(suggestions);
    });
  }, []);

  const search = async (value?: string) => {
    const q = (value ?? serial).trim();
    if (!q) return;

    setLoading(true);
    setError("");
    setStock(null);
    setSetInfo(null);
    setHistory([]);
    setShowAll(false);

    const res = await fetch(`/api/services/history/${encodeURIComponent(q)}`);
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      if (data.searchMode === "set" && data.stockSet) {
        setSearchMode("set");
        setSetInfo(data.stockSet);
        setStock(null);
        setDisplayStatus(data.displayStatus || data.stockSet.currentStatus);
      } else {
        setSearchMode("serial");
        setStock(data.stock);
        setSetInfo(null);
        setDisplayStatus(data.displayStatus || data.stock?.currentStatus || "");
      }
      setHistory(data.history || []);
    } else {
      setError(data.error || "Not found in Stock Master");
    }
  };

  useEffect(() => {
    const fromUrl = params.get("serial");
    if (fromUrl) search(fromUrl);
  }, [params]);

  const visibleHistory = showAll ? history : history.slice(0, PREVIEW_ROWS);
  const modelName = searchMode === "set" && setInfo
    ? `${setInfo.make ? setInfo.make + " " : ""}${setInfo.modelNumber}`
    : stock
      ? `${stock.make ? stock.make + " " : ""}${stock.modelNumber}`
      : "";

  return (
    <div className="card-panel overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-lg font-bold text-slate-800">
          Service / Material History
          <span className="ml-1 text-base font-normal text-slate-500">(Search by Serial Number or Set Serial)</span>
        </h2>
      </div>

      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              list="serial-suggestions"
              className="input-field pl-9"
              placeholder="Enter Serial Number or Set Serial (Main)"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <datalist id="serial-suggestions">
              {stockList.map((s) => (
              <option key={s.serialNumber} value={s.serialNumber}>
                {s.label ? `${s.label} — ` : ""}{s.modelNumber}
              </option>
              ))}
            </datalist>
          </div>
          <Button onClick={() => search()} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {(stock || setInfo) && (
        <>
          <div className="grid grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {searchMode === "set" ? "Set Serial (Main)" : "Serial Number"}
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                {searchMode === "set" ? setInfo?.mainSerialNumber : stock?.serialNumber}
              </p>
              {searchMode === "set" && setInfo && (
                <p className="mt-0.5 font-mono text-xs text-indigo-600">{setInfo.setId}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Model Name</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{modelName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
              <div className="mt-1">
                <StatusBadge status={displayStatus} />
              </div>
            </div>
          </div>

          {searchMode === "set" && setInfo?.items && (
            <div className="border-b border-slate-100 px-6 py-3">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Set Items</p>
              <div className="flex flex-wrap gap-2">
                {setInfo.items.map((item) => (
                  <span key={item.serialNumber} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                    {item.serialNumber} {item.partRole ? `(${item.partRole})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="px-6 py-4">
            <h3 className="mb-4 text-sm font-bold text-slate-700">Material / Service History</h3>

            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No history records found for this serial number
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Date", "Activity", "Details", "Reference No.", "Location / Party"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleHistory.map((entry, i) => (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                            {formatDate(entry.date)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">
                            {entry.activity}
                          </td>
                          <td className="max-w-[220px] px-4 py-3 text-sm text-slate-600">
                            {entry.details}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-blue-600">
                            {entry.reference}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {entry.party}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {history.length > PREVIEW_ROWS && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      {showAll ? "Show Less" : "View Full History"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {!stock && !setInfo && !error && !loading && (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <Search size={36} className="mb-3 text-slate-300" />
          <p className="text-base font-semibold text-slate-600">Search by Serial Number</p>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            Enter a serial number or set main serial to view complete material and service history.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
      </div>
    }>
      <ServicesContent />
    </Suspense>
  );
}
