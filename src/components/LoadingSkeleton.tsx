export function LoadingSkeleton({ count = 4 }: { count?: number } = {}) {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-surface"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-3">
            <div className="h-5 w-16 rounded-md animate-shimmer" />
            <div className="h-4 w-28 rounded-md animate-shimmer" />
            <div className="ml-auto h-4 w-14 rounded-md animate-shimmer" />
          </div>
          <div className="flex flex-col gap-2.5 px-5 py-4">
            <div className="h-3.5 w-4/5 rounded animate-shimmer" />
            <div className="h-3.5 w-3/5 rounded animate-shimmer" />
            <div className="h-3.5 w-2/3 rounded animate-shimmer" />
          </div>
          <div className="border-t border-border-subtle px-5 py-2.5">
            <div className="h-3 w-24 rounded animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
