"use client";

import { useEffect, useState } from "react";
import {
  Package,
  CheckCircle,
  Presentation,
  Wrench,
  ShoppingBag,
  RotateCcw,
  AlertTriangle,
  Activity,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";

interface Stats {
  totalStock: number;
  availableStock: number;
  demoMaterials: number;
  repairMaterials: number;
  soldMaterials: number;
  oemReturnPending: number;
  overdueDemoUnits: number;
  activeRepairCases: number;
  recentMovements: Array<{
    movementId: string;
    serialNumber: string;
    date: string;
    movementType: string;
    fromLocation: string;
    toLocation: string;
    user: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const kpis = [
    { label: "Total Stock", value: stats?.totalStock ?? 0, icon: Package, color: "bg-blue-100 text-blue-600" },
    { label: "Available Stock", value: stats?.availableStock ?? 0, icon: CheckCircle, color: "bg-emerald-100 text-emerald-600" },
    { label: "Demo Materials", value: stats?.demoMaterials ?? 0, icon: Presentation, color: "bg-violet-100 text-violet-600" },
    { label: "Repair Materials", value: stats?.repairMaterials ?? 0, icon: Wrench, color: "bg-orange-100 text-orange-600" },
    { label: "Sold Materials", value: stats?.soldMaterials ?? 0, icon: ShoppingBag, color: "bg-slate-100 text-slate-600" },
    { label: "OEM Return Pending", value: stats?.oemReturnPending ?? 0, icon: RotateCcw, color: "bg-indigo-100 text-indigo-600" },
    { label: "Overdue Demo Units", value: stats?.overdueDemoUnits ?? 0, icon: AlertTriangle, color: "bg-rose-100 text-rose-600" },
    { label: "Active Repair Cases", value: stats?.activeRepairCases ?? 0, icon: Activity, color: "bg-amber-100 text-amber-600" },
  ];

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="kpi-card flex items-center gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${k.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{k.value}</p>
                <p className="text-sm font-semibold text-slate-600">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-panel overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">Recent Stock Movements</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Movement ID</th>
              <th className="table-header">Serial No.</th>
              <th className="table-header">Type</th>
              <th className="table-header">From → To</th>
              <th className="table-header">Date</th>
              <th className="table-header">User</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentMovements.map((m) => (
              <tr key={m.movementId} className="table-row">
                <td className="table-cell font-mono text-xs text-blue-600">{m.movementId}</td>
                <td className="table-cell font-medium">{m.serialNumber}</td>
                <td className="table-cell"><StatusBadge status={m.movementType} /></td>
                <td className="table-cell text-xs text-slate-500">{m.fromLocation} → {m.toLocation}</td>
                <td className="table-cell text-xs">{formatDateTime(m.date)}</td>
                <td className="table-cell">{m.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
