export const NAV_ITEMS = [
  { label: 'Nieuws', to: '/nieuws' },
  { label: 'Wedstrijden', to: '/wedstrijden' },
  { label: 'Activiteiten', to: '/agenda' },
  { label: 'Trainingsschema', to: '/trainingsschema' },
  {
    label: 'Clubinformatie',
    children: [
      { label: 'Plattegrond', to: '/plattegrond' },
      { label: 'Huisstijl', to: '/huistijl' },
    ],
  },
]
