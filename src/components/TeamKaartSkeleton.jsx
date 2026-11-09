// Laadstaat van een teamkaart: grijs vlak in 4:3 en een naamregel.
export default function TeamKaartSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-w-0 animate-pulse" aria-hidden="true">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="px-3 py-3 flex justify-center">
        <div className="h-5 w-2/3 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export function TeamsSkeleton({ titel, aantal = 6 }) {
  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-8" role="status" aria-label="Teams laden">
      <h2 className="text-lg font-bold text-gray-800">{titel}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: aantal }, (_, i) => <TeamKaartSkeleton key={i} />)}
      </div>
    </div>
  )
}
