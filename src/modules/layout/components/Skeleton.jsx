export function SkeletonCard() {
    return (
        <div className="animate-pulse">
            <div className="rounded-2xl bg-slate-200 aspect-square mb-3" />
            <div className="space-y-2 p-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
                <div className="h-10 bg-slate-200 rounded-xl mt-2" />
            </div>
        </div>
    )
}

export function SkeletonGrid({ count = 6 }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    )
}

export function SkeletonLine({ width = '100%', height = '1rem' }) {
    return <div className="animate-pulse bg-slate-200 rounded" style={{ width, height }} />
}

export function SkeletonPage() {
    return (
        <div className="container-app py-8 space-y-8">
            <div className="space-y-3">
                <SkeletonLine width="200px" height="2rem" />
                <SkeletonLine width="120px" height="1rem" />
            </div>
            <SkeletonGrid count={12} />
        </div>
    )
}
