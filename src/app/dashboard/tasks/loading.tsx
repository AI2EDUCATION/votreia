export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-48 skeleton rounded mb-2" />
        <div className="h-4 w-64 skeleton rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <div className="h-10 w-10 skeleton rounded-xl mb-3" />
            <div className="h-5 w-24 skeleton rounded mb-2" />
            <div className="h-4 w-full skeleton rounded" />
          </div>
        ))}
      </div>
      <div className="card p-0">
        <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06]">
          <div className="h-5 w-32 skeleton rounded" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-3 border-b border-surface-100 dark:border-white/[0.04] last:border-0">
            <div className="w-8 h-8 skeleton rounded-lg" />
            <div className="flex-1">
              <div className="h-4 w-40 skeleton rounded mb-1" />
              <div className="h-3 w-24 skeleton rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
