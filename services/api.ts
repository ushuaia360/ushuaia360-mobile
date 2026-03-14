import { API_BASE_URL } from '@/constants/api';

interface RequestOptions {
  method?: string;
  body?: object;
  token?: string | null;
}

/**
 * Wrapper de fetch para el backend.
 * Lanza un Error con el mensaje del backend si la respuesta no es 2xx.
 */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? 'Error en la solicitud');
  }

  return data as T;
}
