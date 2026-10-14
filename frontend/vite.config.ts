import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento o Vite encaminha a API e o WebSocket para o Spring Boot (porta 8080).
// O header Origin é removido porque, para o navegador, as chamadas são da mesma origem; assim a
// demonstração também funciona acessando pelo IP da máquina (ex.: pelo celular na mesma rede).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // `--mode standalone`: build sem backend, depois embutido num único HTML (scripts/inline-standalone.mjs).
  ...(mode === 'standalone' && {
    base: './',
    build: {
      outDir: 'dist-standalone',
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  }),
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        configure: (proxy) => proxy.on('proxyReq', (request) => request.removeHeader('origin')),
      },
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
}));
