import { STANDALONE } from '../config';

const TOKEN_KEY = 'effexmed.token';

// No modo standalone a sessão fica por aba, para permitir médico e paciente logados em abas diferentes.
function tokenStorage(): Storage {
  return STANDALONE ? sessionStorage : localStorage;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Cópia em memória para quando o navegador bloqueia o armazenamento (ex.: aba anônima).
let memoryToken: string | null = null;

export function getToken(): string | null {
  try {
    return tokenStorage().getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) tokenStorage().setItem(TOKEN_KEY, token);
    else tokenStorage().removeItem(TOKEN_KEY);
  } catch {
    /* armazenamento indisponível: fica só a cópia em memória */
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Chamado quando a API responde 401 para uma requisição autenticada (token expirado). */
export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  if (STANDALONE) {
    const { handleRequest } = await import('../standalone/server');
    try {
      return await handleRequest<T>(method, path, body, token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && token) unauthorizedHandler?.();
      throw error;
    }
  }

  const isForm = body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  if (response.status === 401 && token) {
    unauthorizedHandler?.();
  }
  if (!response.ok) {
    let message = 'Não foi possível concluir a operação. Tente novamente.';
    let fieldErrors: Record<string, string> = {};
    try {
      const problem = await response.json();
      if (problem?.detail) message = problem.detail;
      if (problem?.errors) fieldErrors = problem.errors;
    } catch {
      /* resposta sem corpo */
    }
    if (response.status === 403 && message.startsWith('Não foi possível')) {
      message = 'Você não tem permissão para esta ação.';
    }
    throw new ApiError(response.status, message, fieldErrors);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const imageCache = new Map<string, Promise<string>>();

/**
 * Carrega uma imagem protegida (ex.: foto de perfil) com o token de acesso e devolve uma URL local.
 * Data URLs (modo standalone) são usadas diretamente. As URLs da API são versionadas, então o cache é seguro.
 */
export function loadImage(url: string): Promise<string> {
  if (url.startsWith('data:') || url.startsWith('blob:')) return Promise.resolve(url);
  let cached = imageCache.get(url);
  if (!cached) {
    const token = getToken();
    cached = fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => {
        if (!response.ok) throw new ApiError(response.status, 'Imagem indisponível.');
        return response.blob();
      })
      .then((blob) => URL.createObjectURL(blob));
    cached.catch(() => imageCache.delete(url));
    imageCache.set(url, cached);
  }
  return cached;
}
