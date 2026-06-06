"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";

export default function MovementsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const url = filter ? `/api/movements?serialNumber=${encodeURIComponent(filter)}` : "/api/movements";
    fetch(url).then((r) => r.json()).then(setRows);
  }, [filter]);

  return (
    <div>
      <div className="mb-4">
        <input className="input-field max-w-sm" placeholder="Filter by Serial Number..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr>
              {["Movement ID", "Serial No.", "Date", "Type", "From", "To", "User", "Remarks"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.movementId)} className="table-row">
                <td className="table-cell font-mono text-xs text-blue-600">{String(r.movementId)}</td>
                <td className="table-cell font-semibold">{String(r.serialNumber)}</td>
                <td className="table-cell text-xs">{formatDateTime(String(r.date))}</td>
                <td className="table-cell"><StatusBadge status={String(r.movementType)} /></td>
                <td className="table-cell">{String(r.fromLocation)}</td>
                <td className="table-cell">{String(r.toLocation)}</td>
                <td className="table-cell">{String(r.user)}</td>
                <td className="table-cell text-xs text-slate-500">{String(r.remarks || "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
