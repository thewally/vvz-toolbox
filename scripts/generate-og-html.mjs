import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const BASE_URL = 'https://thewally.github.io/vvz-toolbox'
const DIST = 'dist'

const pages = [
  {
    path: '',
    title: "Website van VVZ'49",
    description: "De digitale toolbox van VVZ'49 – trainingsschema, agenda, plattegrond en huistijl.",
    image: `${BASE_URL}/og/home.png`,
    url: `${BASE_URL}/`,
  },
  {
    path: 'agenda',
    title: "Agenda | Website van VVZ'49",
    description: "Komende activiteiten en evenementen van VVZ'49.",
    image: `${BASE_URL}/og/agenda.png`,
    url: `${BASE_URL}/agenda`,
  },
  {
    path: 'trainingsschema',
    title: "Trainingsschema | Website van VVZ'49",
    description: "Weekoverzicht van trainingstijden en veldindeling bij VVZ'49.",
    image: `${BASE_URL}/og/trainingsschema.png`,
    url: `${BASE_URL}/trainingsschema`,
  },
  {
    path: 'plattegrond',
    title: "Plattegrond | Website van VVZ'49",
    description: 'Overzicht van Sportpark Zonnegloren met downloadbare bestanden.',
    image: `${BASE_URL}/og/plattegrond.png`,
    url: `${BASE_URL}/plattegrond`,
  },
  {
    path: 'huistijl',
    title: "Huistijl | Website van VVZ'49",
    description: "Logo's en officiële huistijlmiddelen van VVZ'49.",
    image: `${BASE_URL}/og/huistijl.png`,
    url: `${BASE_URL}/huistijl`,
  },
]

function ogTags(page) {
  return `  <title>${page.title}</title>
  <meta name="description" content="${page.description}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${page.description}">
  <meta property="og:image" content="${page.image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${page.url}">
  <meta property="og:site_name" content="Website van VVZ'49">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${page.title}">
  <meta name="twitter:description" content="${page.description}">
  <meta name="twitter:image" content="${page.image}">`
}

const template = readFileSync(`${DIST}/index.html`, 'utf8')

for (const page of pages) {
  let html = template.replace(/<title>.*?<\/title>/, '')
  html = html.replace('<head>', '<head>\n' + ogTags(page))

  if (page.path === '') {
    writeFileSync(`${DIST}/index.html`, html)
    console.log('Updated dist/index.html')
  } else {
    mkdirSync(`${DIST}/${page.path}`, { recursive: true })
    writeFileSync(`${DIST}/${page.path}/index.html`, html)
    console.log(`Created dist/${page.path}/index.html`)
  }
}
