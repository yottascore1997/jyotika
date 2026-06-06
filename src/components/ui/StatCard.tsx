import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  trend?: string;
  delay?: number;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  trend,
  delay = 0,
}: StatCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-[0.07] transition-opacity group-hover:opacity-[0.12]`} />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
        >
          <Icon size={22} />
        </div>
        {trend && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
            {trend}
          </span>
        )}
      </div>
      <div className="relative mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      </div>
    </div>
  );
}
