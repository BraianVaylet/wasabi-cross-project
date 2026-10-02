import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // spec §5: al haber una versión nueva se le avisa al usuario con un popup.
      // `prompt` es lo que habilita ese popup; `autoUpdate` actualizaría a espaldas suyas.
      registerType: 'prompt',
      // Para que también estén en el service worker, y la app instalada los tenga sin conexión.
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Wasabi Cross',
        short_name: 'Wasabi',
        description: 'Gestioná tus ejercicios, RMs y tu evolución en el tiempo.',
        lang: 'es-AR',
        start_url: '/',
        display: 'standalone',
        // El fondo del tema único (ADR-0008): la barra del sistema y el arranque, iguales a la app.
        background_color: '#0f041c',
        theme_color: '#0f041c',
        // El logo (`pnpm --filter @wasabi-cross/web icons`). Android pide el de 192 y el de
        // 512; el maskable es el que se recorta con la forma que use el sistema.
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
