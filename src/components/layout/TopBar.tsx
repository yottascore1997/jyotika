"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { useState } from "react";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/stock": "Stock Master",
  "/po": "PO Management",
  "/tender": "Tender Management",
  "/services": "Service History",
  "/receipt": "Material Receipt",
  "/issue": "Material Issue",
  "/demo": "Demo Tracking",
  "/handover": "Customer Handover",
  "/repair": "Repair Management",
  "/oem-return": "OEM Return",
  "/sales": "Sales Management",
  "/movements": "Stock Movement History",
  "/traceability": "Serial Number Traceability",
};

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [serial, setSerial] = useState("");

  const title = titles[pathname] || "Dashboard";

  const searchSerial = (e: React.FormEvent) => {
    e.preventDefault();
    if (serial.trim()) router.push(`/services?serial=${encodeURIComponent(serial.trim())}`);
  };

  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      <div className="flex items-center gap-3">
        <form onSubmit={searchSerial} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Search Serial Number..."
            className="w-72 rounded-lg border border-content-border bg-white py-2.5 pl-10 pr-4 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </form>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-content-border bg-white text-slate-600 shadow-sm">
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex h-10 items-center gap-2 rounded-lg border border-content-border bg-white px-3 shadow-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
            A
          </div>
          <span className="text-base font-semibold text-slate-800">Admin</span>
        </div>
      </div>
    </header>
  );
}
