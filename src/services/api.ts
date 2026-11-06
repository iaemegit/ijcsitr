async function api<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch("/api" + url, options);
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Unable to load data. Please try again.");
  return data;
}
export default api;
