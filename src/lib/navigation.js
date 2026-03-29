export const QUICK_LINKS = [
  { label: 'Nieuws', to: '/nieuws' },
  { label: 'Activiteiten', to: '/activiteiten' },
  { label: 'Vrijwilliger worden?', to: '/vrijwilliger' },
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
      { label: 'Afgelastingen', to: '/wedstrijden/afgelastingen' },
      { label: 'Wedstrijdverslagen', to: '/wedstrijden/verslagen' },
      { label: 'Topscorers & Keeperstrofee', to: '/wedstrijden/topscorers' },
    ],
  },
  {
    label: 'TEAMS',
    children: [
      { label: 'Senioren', to: '/teams/senioren' },
      { label: 'Veteranen', to: '/teams/veteranen' },
      { label: 'Junioren', to: '/teams/junioren' },
      { label: 'Pupillen', to: '/teams/pupillen' },
      { label: 'Zaalvoetbal', to: '/teams/zaalvoetbal' },
    ],
  },
  {
    label: 'TRAINEN',
    children: [
      { label: 'Trainingsschema', to: '/trainingsschema' },
      { label: 'Veldindeling', to: '/trainingsschema/veldindeling' },
      { label: 'Techniektrainingen', to: '/techniektrainingen' },
    ],
  },
  {
    label: 'SPONSORING',
    children: [
      { label: 'Sponsors', to: '/sponsors' },
      { label: 'Sponsor worden?', to: '/sponsoring/sponsor-worden' },
      { label: 'Sponsor Acties', to: '/sponsoring/acties' },
    ],
  },
  {
    label: 'CLUBINFORMATIE',
    children: [
      { label: 'Plattegrond', to: '/plattegrond' },
      { label: 'Huisstijl', to: '/huistijl' },
      { label: 'Historie', to: '/club/historie' },
      { label: 'Ereleden', to: '/club/ereleden' },
      { label: 'Reglementen', to: '/club/reglementen' },
    ],
  },
  {
    label: 'LIDMAATSCHAP',
    children: [
      { label: 'Lid worden?', to: '/lid-worden' },
      { label: 'Contributie', to: '/lidmaatschap/contributie' },
      { label: 'Vrijwilliger worden?', to: '/vrijwilliger' },
    ],
  },
  {
    label: 'CONTACT',
    children: [
      { label: 'Contactgegevens', to: '/contact/gegevens' },
      { label: 'Wie doet wat?', to: '/contact/wie-doet-wat' },
      { label: 'Locatie & Routebeschrijving', to: '/contact/locatie' },
    ],
  },
]
