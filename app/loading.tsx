export default function Loading() {
  return (
    <div>
      <section
        className="py-16 px-4"
        style={{ background: 'linear-gradient(135deg, #F5C000 0%, #FFFBEF 60%, #D9247A 100%)' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="h-7 w-32 bg-white/40 rounded-lg animate-pulse mb-4" />
          <div className="h-16 w-72 bg-white/40 rounded-lg animate-pulse mb-3" />
          <div className="h-6 w-80 bg-white/30 rounded animate-pulse mb-8" />
          <div className="flex gap-3">
            <div className="h-12 w-32 bg-white/40 rounded-xl animate-pulse" />
            <div className="h-12 w-32 bg-white/40 rounded-xl animate-pulse" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-8 w-44 bg-gray-200 rounded-xl animate-pulse mx-auto mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-gray-200 border-[2.5px] border-gray-200 animate-pulse"
            />
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-44 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-2xl bg-gray-200 border-[2.5px] border-gray-200 animate-pulse"
            />
          ))}
        </div>
      </section>
    </div>
  )
}
