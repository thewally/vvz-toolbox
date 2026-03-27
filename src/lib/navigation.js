export const QUICK_LINKS = [
  { label: 'Nieuws', to: '/nieuws' },
  { label: 'Activiteiten', to: '/agenda' },
  { label: 'Wordt vrijwilliger', to: '/vrijwilliger' },
  { label: 'Sponsors', to: '/sponsors' },
  { label: 'Ledenshop', href: 'https://clubs.stanno.com/nl/vvz-49/clubcollectie' },
  { label: 'Lid worden?', to: '/lid-worden' },
]

export const NAV_SECTIONS = [
  {
    label: 'WEDSTRIJDINFORMATIE',
    children: [
      { label: 'Programma', to: '/wedstrijden/programma' },
      { label: 'Uitslagen', to: '/wedstrijden/uitslagen' },
    ],
  },
  {
    label: 'TEAMS',
    children: [
      { label: 'Senioren', to: '/wedstrijden/teams/senioren' },
      { label: 'Junioren', to: '/wedstrijden/teams/junioren' },
      { label: 'Pupillen', to: '/wedstrijden/teams/pupillen' },
    ],
  },
  {
    label: 'TRAINEN',
    children: [
      { label: 'Trainingsschema', to: '/trainingsschema' },
      { label: 'Techniektrainingen', to: '/techniektrainingen' },
    ],
  },
  {
    label: 'CLUBINFORMATIE',
    children: [
      { label: 'Plattegrond', to: '/plattegrond' },
      { label: 'Huisstijl', to: '/huistijl' },
    ],
  },
  { label: 'Contact', to: '/contact' },
]
