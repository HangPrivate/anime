export function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card">
          <div className="aspect-[2/3] skeleton" />
          <div className="p-2.5 space-y-2">
            <div className="h-3 skeleton w-full" />
            <div className="h-3 skeleton w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="fade-in space-y-4 p-4">
      <div className="flex gap-4">
        <div className="w-32 aspect-[2/3] skeleton rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 skeleton w-3/4" />
          <div className="h-4 skeleton w-1/2" />
          <div className="h-3 skeleton w-full" />
          <div className="h-3 skeleton w-2/3" />
          <div className="h-8 skeleton w-24 rounded-lg" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 skeleton w-1/3" />
        <div className="h-3 skeleton w-full" />
        <div className="h-3 skeleton w-full" />
        <div className="h-3 skeleton w-2/3" />
      </div>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 skeleton w-24" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="w-28 flex-shrink-0">
                <div className="aspect-[2/3] skeleton rounded-xl" />
                <div className="h-3 skeleton w-full mt-2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
