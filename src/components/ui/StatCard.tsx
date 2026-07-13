import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  trend?: string;
  delay?: number;
  compact?: boolean;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  trend,
  delay = 0,
  compact = false,
}: StatCardProps) {
  return (
    <div
      className={`group relative overflow-hidden border border-white/80 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated ${
        compact ? "rounded-xl p-4" : "rounded-2xl p-5"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-[0.07] transition-opacity group-hover:opacity-[0.12]`} />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex items-center justify-center bg-gradient-to-br ${gradient} text-white shadow-md ${
            compact ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-2xl"
          }`}
        >
          <Icon size={compact ? 16 : 22} />
        </div>
        {trend && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
            {trend}
          </span>
        )}
      </div>
      <div className={`relative ${compact ? "mt-2.5" : "mt-4"}`}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        <p className={`mt-0.5 tracking-tight text-slate-900 ${compact ? "text-lg font-bold" : "text-xl font-bold"}`}>{value}</p>
      </div>
    </div>
  );
}
