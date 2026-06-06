import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-400">
        <Icon size={28} />
      </div>
      <h3 className="text-base font-bold text-slate-700">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
    </div>
  );
}
