export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome banner skeleton */}
      <div className="rounded-xl bg-gradient-to-r from-brand-600/50 to-brand-700/50 p-8 animate-pulse">
        <div className="h-4 w-32 bg-white/10 rounded mb-3" />
        <div className="h-8 w-64 bg-white/10 rounded mb-2" />
        <div className="h-4 w-96 bg-white/10 rounded" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="w-10 h-10 skeleton rounded-xl mb-3" />
            <div className="h-7 w-20 skeleton rounded mb-2" />
            <div className="h-4 w-28 skeleton rounded" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card animate-pulse">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06]">
            <div className="h-5 w-32 skeleton rounded" />
          </div>
          <div className="divide-y divide-surface-100 dark:divide-white/[0.04]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 skeleton rounded-full" />
                  <div>
                    <div className="h-4 w-32 skeleton rounded mb-1" />
                    <div className="h-3 w-20 skeleton rounded" />
                  </div>
                </div>
                <div className="h-3 w-12 skeleton rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="card animate-pulse">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06]">
            <div className="h-5 w-20 skeleton rounded" />
          </div>
          <div className="divide-y divide-surface-100 dark:divide-white/[0.04]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 skeleton rounded-lg" />
                <div>
                  <div className="h-4 w-24 skeleton rounded mb-1" />
                  <div className="h-3 w-16 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
