import sharp from 'sharp'
import { mkdir } from 'fs/promises'

const BASE = 'public/og'
const W = 1200, H = 630

const pages = [
  {
    name: 'home',
    title: "VVZ'49 Toolbox",
    sub: "De digitale toolbox van VVZ'49",
    icon: `<rect x="490" y="120" width="220" height="220" rx="24" fill="rgba(255,255,255,0.15)"/>
           <polygon points="600,148 520,210 540,210 540,308 660,308 660,210 680,210" fill="none" stroke="white" stroke-width="8" stroke-linejoin="round"/>
           <rect x="576" y="260" width="48" height="48" rx="4" fill="white"/>`,
  },
  {
    name: 'agenda',
    title: 'Agenda',
    sub: 'Komende activiteiten en evenementen',
    icon: `<rect x="490" y="120" width="220" height="220" rx="24" fill="rgba(255,255,255,0.15)"/>
           <rect x="530" y="148" width="140" height="164" rx="8" fill="none" stroke="white" stroke-width="8"/>
           <line x1="530" y1="188" x2="670" y2="188" stroke="white" stroke-width="8"/>
           <line x1="565" y1="133" x2="565" y2="163" stroke="white" stroke-width="8" stroke-linecap="round"/>
           <line x1="635" y1="133" x2="635" y2="163" stroke="white" stroke-width="8" stroke-linecap="round"/>
           <rect x="548" y="210" width="16" height="16" rx="3" fill="white"/>
           <rect x="592" y="210" width="16" height="16" rx="3" fill="white"/>
           <rect x="636" y="210" width="16" height="16" rx="3" fill="white"/>
           <rect x="548" y="242" width="16" height="16" rx="3" fill="white"/>
           <rect x="592" y="242" width="16" height="16" rx="3" fill="white"/>`,
  },
  {
    name: 'trainingsschema',
    title: 'Trainingsschema',
    sub: 'Weekoverzicht trainingstijden en veldindeling',
    icon: `<rect x="490" y="120" width="220" height="220" rx="24" fill="rgba(255,255,255,0.15)"/>
           <rect x="530" y="148" width="140" height="164" rx="8" fill="none" stroke="white" stroke-width="8"/>
           <line x1="530" y1="188" x2="670" y2="188" stroke="white" stroke-width="8"/>
           <line x1="578" y1="148" x2="578" y2="312" stroke="white" stroke-width="4"/>
           <line x1="622" y1="148" x2="622" y2="312" stroke="white" stroke-width="4"/>
           <rect x="586" y="200" width="28" height="16" rx="3" fill="white"/>
           <rect x="542" y="224" width="28" height="16" rx="3" fill="white"/>
           <rect x="630" y="248" width="28" height="16" rx="3" fill="white"/>`,
  },
  {
    name: 'plattegrond',
    title: 'Plattegrond',
    sub: 'Overzicht van Sportpark Zonnegloren',
    icon: `<rect x="490" y="120" width="220" height="220" rx="24" fill="rgba(255,255,255,0.15)"/>
           <polygon points="520,160 600,140 680,165 680,315 600,290 520,315" fill="none" stroke="white" stroke-width="8" stroke-linejoin="round"/>
           <line x1="600" y1="140" x2="600" y2="290" stroke="white" stroke-width="5"/>
           <path d="M580,195 Q580,168 600,168 Q620,168 620,195 Q620,218 600,238 Q580,218 580,195 Z" fill="white"/>
           <circle cx="600" cy="193" r="8" fill="rgba(46,125,50,0.8)"/>`,
  },
  {
    name: 'huistijl',
    title: 'Huistijl',
    sub: "Logo's en officiële huistijlmiddelen",
    icon: `<rect x="490" y="120" width="220" height="220" rx="24" fill="rgba(255,255,255,0.15)"/>
           <rect x="588" y="145" width="24" height="80" rx="6" fill="white"/>
           <rect x="578" y="223" width="44" height="14" rx="3" fill="white"/>
           <rect x="566" y="237" width="68" height="56" rx="8" fill="white"/>
           <line x1="580" y1="248" x2="580" y2="290" stroke="rgba(46,125,50,0.5)" stroke-width="4" stroke-linecap="round"/>
           <line x1="592" y1="248" x2="592" y2="292" stroke="rgba(46,125,50,0.5)" stroke-width="4" stroke-linecap="round"/>
           <line x1="604" y1="248" x2="604" y2="292" stroke="rgba(46,125,50,0.5)" stroke-width="4" stroke-linecap="round"/>
           <line x1="616" y1="248" x2="616" y2="292" stroke="rgba(46,125,50,0.5)" stroke-width="4" stroke-linecap="round"/>
           <line x1="628" y1="248" x2="628" y2="290" stroke="rgba(46,125,50,0.5)" stroke-width="4" stroke-linecap="round"/>`,
  },
]

await mkdir(BASE, { recursive: true })

for (const page of pages) {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#1B5E20"/>
    <rect width="${W}" height="${H}" fill="url(#grad)"/>
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#2E7D32;stop-opacity:1"/>
        <stop offset="100%" style="stop-color:#1B5E20;stop-opacity:1"/>
      </linearGradient>
    </defs>
    ${page.icon}
    <text x="80" y="430" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white">${page.title}</text>
    <text x="80" y="510" font-family="Arial, sans-serif" font-size="40" fill="rgba(255,255,255,0.8)">${page.sub}</text>
    <text x="80" y="590" font-family="Arial, sans-serif" font-size="32" fill="rgba(255,255,255,0.45)">VVZ'49 · Soest</text>
  </svg>`

  await sharp(Buffer.from(svg)).png().toFile(`${BASE}/${page.name}.png`)
  console.log(`Generated ${BASE}/${page.name}.png`)
}
