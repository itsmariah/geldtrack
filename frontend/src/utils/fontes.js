// Fontes do app: Manrope no texto e Geist nos títulos (ver --font-body/--font-display em
// index.css). Os arquivos ficam em public/fonts — copiados pro build e precacheados pelo
// PWA, então funcionam offline e no Electron.
//
// São registradas pela FontFace API em vez de @font-face no CSS: um url() dentro do CSS
// faz o build do Vite falhar nesta máquina ("[postcss] UNKNOWN: unknown error, read",
// ligado à pasta sincronizada pelo OneDrive). Pelo JS o resultado é o mesmo — o navegador
// só baixa cada arquivo quando aparece texto que precisa dele (unicode-range).
//
// Só os subconjuntos latino e latino estendido (português e símbolos de moeda), em arquivos
// variáveis (um arquivo cobre todos os pesos). Ambas sob a SIL Open Font License, tiradas
// dos pacotes @fontsource-variable/manrope e @fontsource-variable/geist.

const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
const LATIN_EXT = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'

const FONTES = [
  { familia: 'Manrope', arquivo: 'manrope-latin-wght-normal.woff2', pesos: '200 800', faixa: LATIN },
  { familia: 'Manrope', arquivo: 'manrope-latin-ext-wght-normal.woff2', pesos: '200 800', faixa: LATIN_EXT },
  { familia: 'Geist', arquivo: 'geist-latin-wght-normal.woff2', pesos: '100 900', faixa: LATIN },
  { familia: 'Geist', arquivo: 'geist-latin-ext-wght-normal.woff2', pesos: '100 900', faixa: LATIN_EXT },
]

export function registrarFontes() {
  if (typeof window === 'undefined' || !('FontFace' in window) || !document.fonts) return
  // BASE_URL é "/" na web e "./" no Electron (file://) — o caminho funciona nos dois.
  const base = import.meta.env.BASE_URL
  for (const { familia, arquivo, pesos, faixa } of FONTES) {
    const fonte = new FontFace(familia, `url(${base}fonts/${arquivo}) format('woff2')`, {
      weight: pesos,
      style: 'normal',
      display: 'swap',
      unicodeRange: faixa,
    })
    document.fonts.add(fonte)
  }
}
