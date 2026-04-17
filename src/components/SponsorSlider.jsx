import { useEffect, useState } from 'react'
import { getSponsors, getSponsorGroepen } from '../services/sponsors'

export default function SponsorSlider() {
  const [items, setItems] = useState([])

  useEffect(() => {
    Promise.all([getSponsors(), getSponsorGroepen()]).then(([s, g]) => {
      const sponsors = s.data ?? []
      const groepen = g.data ?? []

      const sliderItems = []

      for (const groep of groepen) {
        if (groep.slider_weergave === 'geen') continue
        const groepSponsors = sponsors.filter(sp => sp.groep_id === groep.id)

        if (groep.slider_weergave === 'groot') {
          for (const sp of groepSponsors) {
            sliderItems.push({ type: 'groot', sponsor: sp })
          }
        } else if (groep.slider_weergave === 'klein') {
          for (let i = 0; i < groepSponsors.length; i += 2) {
            sliderItems.push({ type: 'klein', paar: groepSponsors.slice(i, i + 2) })
          }
        }
      }

      setItems(sliderItems)
    })
  }, [])

  if (items.length === 0) return null

  let base = [...items]
  while (base.length < 12) base = [...base, ...items]
  const doubled = [...base, ...base]

  return (
    <div className="w-full overflow-hidden bg-gray-200 border-y border-gray-300 py-2 sm:py-4">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-inner {
          animation: marquee 50s linear infinite;
        }
      `}</style>
      <div className="marquee-inner flex gap-6 sm:gap-12 items-center w-max">
        {doubled.map((item, idx) =>
          item.type === 'groot' ? (
            <a
              key={idx}
              href={item.sponsor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center justify-center rounded-lg h-7 w-[70px] sm:h-20 sm:w-[200px] p-1 sm:p-4 shadow-sm"
              style={{ backgroundColor: item.sponsor.logo_achtergrond || '#ffffff' }}
            >
              {item.sponsor.logo_url ? (
                <img
                  src={item.sponsor.logo_url}
                  alt={item.sponsor.naam}
                  className="h-6 sm:h-16 w-auto max-w-[60px] sm:max-w-[180px] object-contain"
                />
              ) : (
                <span className="text-xs sm:text-sm font-medium text-gray-700 text-center truncate">{item.sponsor.naam}</span>
              )}
            </a>
          ) : (
            <div key={idx} className="shrink-0 flex flex-col gap-px w-[70px] sm:w-[200px]">
              {item.paar.map(s => (
                <a
                  key={s.id}
                  href={s.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded shadow-sm w-full h-[13px] sm:h-[39px] p-0.5 sm:p-1.5"
                  style={{ backgroundColor: s.logo_achtergrond || '#ffffff' }}
                >
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.naam} className="h-full w-auto max-w-full object-contain" />
                  ) : (
                    <span className="text-[8px] sm:text-xs font-medium text-gray-700 truncate">{s.naam}</span>
                  )}
                </a>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
