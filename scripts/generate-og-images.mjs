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
           <circle cx="600" cy="230" r="80" fill="none" stroke="white" stroke-width="8"/>
           <circle cx="600" cy="230" r="24" fill="white"/>
           <line x1="600" y1="150" x2="600" y2="206" stroke="white" stroke-width="8" stroke-linecap="round"/>
           <line x1="600" y1="254" x2="600" y2="310" stroke="white" stroke-width="8" stroke-linecap="round"/>
           <line x1="520" y1="230" x2="576" y2="230" stroke="white" stroke-width="8" stroke-linecap="round"/>
           <line x1="624" y1="230" x2="680" y2="230" stroke="white" stroke-width="8" stroke-linecap="round"/>
           <line x1="543" y1="173" x2="581" y2="211" stroke="white" stroke-width="6" stroke-linecap="round"/>
           <line x1="619" y1="249" x2="657" y2="287" stroke="white" stroke-width="6" stroke-linecap="round"/>
           <line x1="657" y1="173" x2="619" y2="211" stroke="white" stroke-width="6" stroke-linecap="round"/>
           <line x1="581" y1="249" x2="543" y2="287" stroke="white" stroke-width="6" stroke-linecap="round"/>`,
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
           <path d="M545 155 L655 155 L655 310 L545 310 Z" fill="none" stroke="white" stroke-width="8"/>
           <line x1="545" y1="210" x2="655" y2="210" stroke="white" stroke-width="4"/>
           <line x1="600" y1="155" x2="600" y2="310" stroke="white" stroke-width="4"/>
           <circle cx="575" cy="183" r="10" fill="white"/>`,
  },
  {
    name: 'huistijl',
    title: 'Huistijl',
    sub: "Logo's en officiële huistijlmiddelen",
    icon: `<rect x="490" y="120" width="220" height="220" rx="24" fill="rgba(255,255,255,0.15)"/>
           <circle cx="600" cy="230" r="70" fill="none" stroke="white" stroke-width="8"/>
           <circle cx="600" cy="230" r="30" fill="white"/>
           <line x1="600" y1="145" x2="600" y2="165" stroke="white" stroke-width="8" stroke-linecap="round"/>
           <line x1="600" y1="295" x2="600" y2="315" stroke="white" stroke-width="8" stroke-linecap="round"/>
           <line x1="515" y1="230" x2="535" y2="230" stroke="white" stroke-width="8" stroke-linecap="round"/>
           <line x1="665" y1="230" x2="685" y2="230" stroke="white" stroke-width="8" stroke-linecap="round"/>`,
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
