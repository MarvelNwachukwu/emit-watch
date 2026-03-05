export function AnalyticsPanelSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="h-3 w-24 rounded animate-shimmer" />
          <div className="h-40 w-full rounded-lg animate-shimmer" />
        </div>
      ))}
    </div>
  );
}
