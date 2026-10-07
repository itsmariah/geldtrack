import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// O Electron carrega o build via file://, que exige caminhos relativos ("./").
// Já o deploy web usa roteamento client-side (BrowserRouter), que exige caminhos
// absolutos ("/") para os assets não quebrarem ao acessar/recarregar uma rota
// que não seja a raiz. ELECTRON_BUILD é setado apenas pelos scripts electron:build/electron:pack.
const isElectronBuild = process.env.ELECTRON_BUILD === 'true'

export default defineConfig({
  plugins: [
    react(),
    // PWA só do "app shell" (JS/CSS/HTML/fontes) — nenhuma chamada /api é cacheada,
    // então o app continua exigindo rede pra qualquer dado real. O registro do
    // service worker é manual (ver src/main.jsx), pra pular sozinho dentro do
    // Electron (que carrega via file://, onde service workers não registram).
    // registerType "prompt": versão nova só entra quando o usuário aceita o aviso
    // (components/PwaUpdateBanner.jsx) — nada de trocar o JS no meio do uso.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      workbox: {
        // As imagens importadas na landing também entram no precache: sem isso, um
        // service worker antigo serve o JS antigo, que aponta para imagens com hash
        // que já não existem mais no deploy novo (e aparecem quebradas).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'GeldTrack',
        short_name: 'GeldTrack',
        description: 'Controle financeiro pessoal — transações, orçamentos, metas e mais.',
        lang: 'pt-BR',
        // Cor da navbar no tema escuro; index.html/ThemeContext trocam a
        // <meta name="theme-color"> em tempo real quando o tema muda.
        theme_color: '#1a1d2e',
        background_color: '#0f1117',
        display: 'standalone',
        id: '/',
        start_url: '/dashboard',
        scope: '/',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
        // Atalhos ao pressionar e segurar o ícone do app instalado (Android/Windows).
        shortcuts: [
          { name: 'Nova transação', short_name: 'Nova', url: '/dashboard?nova=1', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Relatórios', url: '/relatorios', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Contas', url: '/contas', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Metas', url: '/metas', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
  base: isElectronBuild ? './' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
