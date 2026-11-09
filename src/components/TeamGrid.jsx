import TeamKaart from './TeamKaart'

// Raster van teamkaarten. Staat bewust op module-niveau (niet in een paginacomponent), zodat
// kaarten bij een nieuwe render van de pagina niet opnieuw worden aangemaakt.
// De eerste 3 kaarten laden hun foto met hoge prioriteit, tot en met 6 direct, de rest lazy.
export function prioriteitVoorIndex(index) {
  if (index < 3) return 'hoog'
  if (index < 6) return 'normaal'
  return 'laag'
}

export default function TeamGrid({ teams, eersteIndex = 0 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {teams.map((team, i) => (
        <TeamKaart key={team.teamcode} team={team} prioriteit={prioriteitVoorIndex(eersteIndex + i)} />
      ))}
    </div>
  )
}
