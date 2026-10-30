const API_BASE = '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('singularity_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('singularity_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('singularity_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    let errMsg = `Error de API (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (data.message && typeof data.message === 'string') { errMsg = data.message; } else if (data.error && typeof data.error === 'string') { errMsg = data.error; }
    } catch {
      // ignore
    }
    if (res.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent('singularity-auth-expired'));
    }
    throw new ApiError(res.status, errMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' })
};
