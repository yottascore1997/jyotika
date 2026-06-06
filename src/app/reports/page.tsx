"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) =>
        setStats({
          totalItems: d.totalItems,
          lowStockCount: d.lowStockCount,
          totalStockValue: d.totalStockValue,
          totalServices: d.totalServices,
        })
      );
  }, []);

  const reports = [
    { label: "Total Inventory Items", value: stats.totalItems ?? 0 },
    { label: "Low Stock Alerts", value: stats.lowStockCount ?? 0 },
    { label: "Total Stock Value", value: formatCurrency(stats.totalStockValue ?? 0) },
    { label: "Total Service Records", value: stats.totalServices ?? 0 },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {reports.map((r) => (
        <div key={r.label} className="card-panel p-6">
          <p className="text-sm text-slate-500">{r.label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{r.value}</p>
        </div>
      ))}
    </div>
  );
}
