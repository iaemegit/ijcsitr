import { useEffect, useState } from "react";
import api from "../services/api";
function useApi<T = any>(url: string) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({
      data: null,
      loading: true,
      error: null,
    });
    api<T>(url, {
      signal: controller.signal,
    })
      .then((data) =>
        setState({
          data,
          loading: false,
          error: null,
        }),
      )
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({
            data: null,
            loading: false,
            error: error.message,
          });
      });
    return () => controller.abort();
  }, [url, retry]);
  return {
    ...state,
    retry: () => setRetry((n) => n + 1),
  };
}
export default useApi;
