export class AdminApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;
}
export default async function adminApi(
  path: string,
  { csrfToken, ...options }: RequestInit & { csrfToken?: string } = {},
) {
  const response = await fetch("/api/admin" + path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      "X-Admin-Request": "1",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== "/login" && path !== "/session")
      window.dispatchEvent(new Event("admin-session-expired"));
    const error = new AdminApiError(
      data.error || "The request could not be completed.",
    );
    error.status = response.status;
    error.fields = data.fields;
    throw error;
  }
  return data;
}
