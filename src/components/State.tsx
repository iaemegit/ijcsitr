"use client";
import { ArrowRight, CircleHelp, LoaderCircle } from "lucide-react";
function State({
  loading = false,
  error,
  retry,
  children,
}: {
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
  children?: React.ReactNode;
}) {
  if (loading)
    return (
      <div className="load-state" role="status">
        <LoaderCircle className="spin" size={26} />
        <span>Loading research…</span>
      </div>
    );
  if (error)
    return (
      <div className="error-state" role="alert">
        <CircleHelp />
        <h3>We couldn’t load this page</h3>
        <p>{error}</p>
        <button className="button btn" onClick={retry}>
          Try again <ArrowRight size={16} />
        </button>
      </div>
    );
  return children;
}
export default State;
