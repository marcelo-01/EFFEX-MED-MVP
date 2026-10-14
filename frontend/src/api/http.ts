const TOKEN_KEY = 'effexmed.token';

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* armazenamento indisponível (ex.: aba anônima) */
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
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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
