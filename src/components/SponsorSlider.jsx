import { useEffect, useState } from 'react'
import { getSponsors } from '../services/sponsors'

export default function SponsorSlider() {
  const [goud, setGoud] = useState([])
  const [zilver, setZilver] = useState([])

  useEffect(() => {
    getSponsors().then(({ data }) => {
      if (!data) return
      setGoud(data.filter(s => s.categorie === 'goud' && s.logo_url))
      setZilver(data.filter(s => s.categorie === 'zilver' && s.logo_url))
    })
  }, [])

  // Groepeer zilver per 2
  const zilverParen = []
  for (let i = 0; i < zilver.length; i += 2) {
    zilverParen.push(zilver.slice(i, i + 2))
  }

  const items = [
    ...goud.map(s => ({ type: 'goud', sponsor: s })),
    ...zilverParen.map(paar => ({ type: 'zilver', paar })),
  ]

  if (items.length === 0) return null

  // Herhaal items tot we er minimaal 12 hebben, zodat de content altijd breder is dan het scherm
  let base = [...items]
  while (base.length < 12) base = [...base, ...items]
  const doubled = [...base, ...base]

  return (
    <div className="w-full overflow-hidden bg-white border-y border-gray-100 py-4">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-inner {
          animation: marquee 30s linear infinite;
        }
      `}</style>
      <div className="marquee-inner flex gap-12 items-center w-max">
        {doubled.map((item, idx) =>
          item.type === 'goud' ? (
            <a
              key={idx}
              href={item.sponsor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center"
            >
              <img
                src={item.sponsor.logo_url}
                alt={item.sponsor.naam}
                className="h-16 w-auto max-w-[180px] object-contain grayscale hover:grayscale-0 transition-all"
              />
            </a>
          ) : (
            <div key={idx} className="shrink-0 flex flex-col gap-2 justify-center">
              {item.paar.map(s => (
                <a
                  key={s.id}
                  href={s.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={s.logo_url}
                    alt={s.naam}
                    className="h-7 w-auto max-w-[120px] object-contain grayscale hover:grayscale-0 transition-all"
                  />
                </a>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
