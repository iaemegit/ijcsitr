import { createContext } from "react";
import type { ApiState, JournalPayload } from "../types/api";
const JournalContext = createContext<ApiState<JournalPayload>>({
  data: null,
  loading: true,
  error: null,
  retry: () => {},
});
export default JournalContext;
