/**
 * Modo "standalone": o frontend roda sozinho, com um backend simulado no navegador
 * (usado na versão publicada como página estática, ex.: Claude Artifacts).
 * Ativado com `npm run build:standalone` (arquivo .env.standalone).
 */
export const STANDALONE = import.meta.env.VITE_STANDALONE === 'true';
