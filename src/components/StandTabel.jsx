export default function StandTabel({ stand }) {
  if (!stand || stand.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-gray-500">
            <th className="py-2 pr-2 w-8">Pos</th>
            <th className="py-2 pr-2">Team</th>
            <th className="py-2 px-1 text-center w-10">Wed</th>
            <th className="py-2 px-1 text-center w-8">W</th>
            <th className="py-2 px-1 text-center w-8">G</th>
            <th className="py-2 px-1 text-center w-8">V</th>
            <th className="py-2 px-1 text-center w-14 hidden sm:table-cell">Dls</th>
            <th className="py-2 pl-1 text-center w-10 font-bold">Pnt</th>
          </tr>
        </thead>
        <tbody>
          {stand.map((rij, i) => (
            <tr
              key={i}
              className={`border-b border-gray-100 ${
                rij.eigenteam === 'true'
                  ? 'bg-vvz-green/10 font-bold'
                  : ''
              }`}
            >
              <td className="py-2 pr-2 text-gray-400">{rij.positie}</td>
              <td className="py-2 pr-2">{rij.teamnaam}</td>
              <td className="py-2 px-1 text-center">{rij.gespeeldewedstrijden}</td>
              <td className="py-2 px-1 text-center">{rij.gewonnen}</td>
              <td className="py-2 px-1 text-center">{rij.gelijkspel}</td>
              <td className="py-2 px-1 text-center">{rij.verloren}</td>
              <td className="py-2 px-1 text-center hidden sm:table-cell">{rij.doelpuntenvoor}-{rij.doelpuntentegen}</td>
              <td className="py-2 pl-1 text-center font-bold">{rij.punten}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
