export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function getJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<T> {
  return request(url, init, timeoutMs, "application/json", (res) => res.json() as Promise<T>);
}

export async function getText(
  url: string,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<string> {
  return request(url, init, timeoutMs, "text/plain", (res) => res.text());
}

async function request<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  accept: string,
  read: (res: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: accept,
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new ApiError(`Request failed (${res.status})`, res.status);
    }
    return await read(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out");
    }
    throw new ApiError(err instanceof Error ? err.message : "Network error");
  } finally {
    clearTimeout(timer);
  }
}
