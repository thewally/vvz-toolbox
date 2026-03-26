export default function StafKader({ staf }) {
  if (!staf || staf.length === 0) return null

  const gefilterd = staf.filter(s => s.rol !== 'Teamspeler' && s.naam !== 'Afgeschermd')
  if (gefilterd.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {gefilterd.map((persoon, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="font-medium text-gray-800">{persoon.naam}</p>
          <p className="text-sm text-gray-500">{persoon.rol}</p>
        </div>
      ))}
    </div>
  )
}
