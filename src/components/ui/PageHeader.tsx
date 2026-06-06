interface PageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  badge?: string;
}

export default function PageHeader({ title, description, action, badge }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {badge && (
          <span className="mb-2 inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary-700">
            {badge}
          </span>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          {title.split(" ").map((word, i, arr) =>
            i === arr.length - 1 ? (
              <span key={i} className="text-gradient">
                {" "}
                {word}
              </span>
            ) : (
              <span key={i}>{i === 0 ? word : ` ${word}`}</span>
            )
          )}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
