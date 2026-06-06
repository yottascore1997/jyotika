import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  count?: number;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  count,
}: SearchBarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md flex-1">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          placeholder={placeholder}
          className="input-field pl-11"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {count !== undefined && (
        <p className="text-sm font-medium text-slate-400">
          <span className="font-bold text-primary-600">{count}</span> records found
        </p>
      )}
    </div>
  );
}
