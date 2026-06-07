const statusStyles: Record<string, string> = {
  Available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Reserved: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Issued: "bg-blue-50 text-blue-700 ring-blue-600/20",
  Demo: "bg-violet-50 text-violet-700 ring-violet-600/20",
  Repair: "bg-orange-50 text-orange-700 ring-orange-600/20",
  Sold: "bg-slate-100 text-slate-700 ring-slate-500/20",
  "Returned To OEM": "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  "Customer Trial": "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  Calibration: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Scrapped: "bg-rose-50 text-rose-700 ring-rose-600/20",
  Active: "bg-blue-50 text-blue-700 ring-blue-600/20",
  Returned: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Overdue: "bg-rose-50 text-rose-700 ring-rose-600/20",
  Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Received: "bg-blue-50 text-blue-700 ring-blue-600/20",
  "Under Repair": "bg-orange-50 text-orange-700 ring-orange-600/20",
  Repaired: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Closed: "bg-slate-100 text-slate-600 ring-slate-500/20",
  PO: "bg-blue-50 text-blue-700 ring-blue-600/20",
  PI: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  Ready: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  Dispatch: "bg-violet-50 text-violet-700 ring-violet-600/20",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export default function StatusBadge({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  const style = statusStyles[status] || "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset ${
        compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
      } ${style}`}
    >
      {status}
    </span>
  );
}
