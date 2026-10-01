// Bounded requests, fixed provider URLs, and a short cache prevent per-keystroke scraping.
const cache = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
export async function cached<T>(
  key: string,
  ttl: number,
  load: () => Promise<T>,
): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.value as T;
  if (pending.has(key)) return pending.get(key) as Promise<T>;
  const task = load()
    .then((value) => {
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(key, { value, expires: Date.now() + ttl });
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
export async function fetchText(
  url: string,
  init: RequestInit = {},
  timeout = 12000,
): Promise<string> {
  const response = await fetch(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok || response.status === 202)
    throw new Error(`Source returned HTTP ${response.status}`);
  if (Number(response.headers.get("content-length")) > 3_000_000)
    throw new Error("Source response too large");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty source response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 3_000_000) throw new Error("Source response too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString("utf8");
}
export function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
