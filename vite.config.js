import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium'),
  },
  server: {
    proxy: {
      '/api/opensky': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opensky/, ''),
      },
      '/api/adsb': {
        target: 'https://api.adsb.lol',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/adsb/, ''),
      },
      '/api/celestrak': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/celestrak/, ''),
      },
      '/api/gdelt': {
        target: 'https://api.gdeltproject.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gdelt/, ''),
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'node_modules/cesium/Build/CesiumUnminified/Workers/**/*', dest: 'cesium/Workers' },
        { src: 'node_modules/cesium/Build/CesiumUnminified/ThirdParty/**/*', dest: 'cesium/ThirdParty' },
        { src: 'node_modules/cesium/Build/CesiumUnminified/Assets/**/*', dest: 'cesium/Assets' },
        { src: 'node_modules/cesium/Build/CesiumUnminified/Widgets/**/*', dest: 'cesium/Widgets' },
      ],
    }),
  ],
});
