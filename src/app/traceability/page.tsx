"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

function TraceContent() {
  const params = useSearchParams();
  const [serial, setSerial] = useState(params.get("serial") || "");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const search = async (s?: string) => {
    const q = s || serial;
    if (!q.trim()) return;
    setError("");
    setData(null);
    const res = await fetch(`/api/stock/trace/${encodeURIComponent(q.trim())}`);
    if (res.ok) setData(await res.json());
    else { setError((await res.json()).error || "Not found"); setData(null); }
  };

  useEffect(() => {
    if (params.get("serial")) search(params.get("serial")!);
  }, [params]);

  const stock = data?.stock as Record<string, unknown> | undefined;
  const timeline = (data?.timeline as Array<Record<string, unknown>>) || [];

  return (
    <div>
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input className="input-field pl-9" placeholder="Enter Serial Number..." value={serial} onChange={(e) => setSerial(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        </div>
        <Button onClick={() => search()}>Trace</Button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {stock && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { l: "Stock ID", v: stock.stockId }, { l: "Serial No.", v: stock.serialNumber },
            { l: "Model", v: stock.modelNumber }, { l: "OEM", v: stock.oemSupplier },
            { l: "Status", v: stock.currentStatus, badge: true }, { l: "Holder", v: stock.currentHolder },
            { l: "Category", v: stock.category }, { l: "Cost", v: formatCurrency(Number(stock.purchaseCost)) },
          ].map(({ l, v, badge }) => (
            <div key={l} className="card-panel p-4">
              <p className="text-xs text-slate-500">{l}</p>
              {badge ? <StatusBadge status={String(v)} /> : <p className="mt-1 font-semibold text-slate-800">{String(v)}</p>}
            </div>
          ))}
        </div>
      )}

      {timeline.length > 0 && (
        <div className="card-panel p-6">
          <h3 className="mb-6 text-sm font-bold text-slate-800">Lifecycle Timeline</h3>
          <div className="relative space-y-0">
            {timeline.map((item, i) => (
              <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
                {i < timeline.length - 1 && <div className="absolute left-[11px] top-6 h-full w-0.5 bg-blue-200" />}
                <div className="relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2 border-blue-600 bg-white" />
                <div className="flex-1 rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{String(item.title)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{String(item.title)}</p>
                    </div>
                    <StatusBadge status={String(item.type)} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(String(item.date))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TraceabilityPage() {
  return (
    <Suspense fallback={<div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" /></div>}>
      <TraceContent />
    </Suspense>
  );
}
