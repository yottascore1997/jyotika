"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  PackageMinus,
  Presentation,
  Users,
  Wrench,
  RotateCcw,
  ShoppingBag,
  History,
  Search,
  Box,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stock", label: "Stock Master", icon: Package },
  { href: "/receipt", label: "Material Receipt", icon: PackagePlus, hidden: true },
  { href: "/issue", label: "Material Issue", icon: PackageMinus, hidden: true },
  { href: "/demo", label: "Demo Tracking", icon: Presentation, hidden: true },
  { href: "/handover", label: "Customer Handover", icon: Users, hidden: true },
  { href: "/repair", label: "Repair Management", icon: Wrench, hidden: true },
  { href: "/oem-return", label: "OEM Return", icon: RotateCcw, hidden: true },
  { href: "/sales", label: "Sales", icon: ShoppingBag, hidden: true },
  { href: "/movements", label: "Movement History", icon: History, hidden: true },
  { href: "/traceability", label: "Serial Traceability", icon: Search, hidden: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col bg-blue-700 shadow-lg">
      <div className="flex items-center gap-3 border-b border-blue-600 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
          <Box size={20} />
        </div>
        <div>
          <p className="text-base font-bold text-white">AssetTrack ERP</p>
          <p className="text-xs font-medium uppercase tracking-wider text-blue-200">
            Serial Lifecycle
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.filter((item) => !item.hidden).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold transition ${
                active
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/90 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={20} className={active ? "text-white" : "text-blue-200"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-blue-600 p-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-blue-200 hover:bg-white/10 hover:text-white">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
