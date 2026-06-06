export default function LoadingSpinner({ height = "h-48" }: { height?: string }) {
  return (
    <div className={`flex ${height} flex-col items-center justify-center gap-4`}>
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600" />
        <div className="absolute inset-2 animate-spin rounded-full border-[3px] border-transparent border-b-primary-400 [animation-direction:reverse] [animation-duration:1.5s]" />
      </div>
      <p className="text-sm font-medium text-slate-400">Loading data...</p>
    </div>
  );
}
