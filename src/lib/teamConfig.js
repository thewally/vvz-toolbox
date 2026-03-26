export const TEAM_CONFIG = [
  { slug: 'vvz-1', naam: 'VVZ 1', teamcode: '9651' },
  { slug: 'vvz-2', naam: 'VVZ 2', teamcode: '9652' },
  { slug: 'vvz-3', naam: 'VVZ 3', teamcode: '9653' },
  { slug: 'jo19-1', naam: 'JO19-1', teamcode: '10131' },
  { slug: 'jo17-1', naam: 'JO17-1', teamcode: '10132' },
  { slug: 'jo15-1', naam: 'JO15-1', teamcode: '10133' },
  { slug: 'jo13-1', naam: 'JO13-1', teamcode: '10134' },
  { slug: 'jo12-1', naam: 'JO12-1', teamcode: '10135' },
  { slug: 'jo11-1', naam: 'JO11-1', teamcode: '10136' },
  { slug: 'jo10-1', naam: 'JO10-1', teamcode: '10137' },
  { slug: 'jo9-1', naam: 'JO9-1', teamcode: '10138' },
]

export function getTeamBySlug(slug) {
  return TEAM_CONFIG.find(t => t.slug === slug) || null
}
