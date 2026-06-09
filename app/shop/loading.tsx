export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-10 w-48 bg-gray-200 rounded-xl animate-pulse mb-2" />
      <div className="h-5 w-24 bg-gray-100 rounded animate-pulse mb-6" />

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 flex-shrink-0">
          <div className="h-96 bg-gray-100 rounded-2xl border-[2.5px] border-gray-200 animate-pulse" />
        </aside>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-2xl bg-gray-200 border-[2.5px] border-gray-200 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
