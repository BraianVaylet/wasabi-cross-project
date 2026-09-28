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
        icons: [],
      },
    }),
  ],
  server: { port: 5173 },
});
