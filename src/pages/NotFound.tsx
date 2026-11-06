"use client";
import { ArrowRight } from "lucide-react";
import { Link } from "../lib/navigation";
import Empty from "../components/Empty";
function NotFound() {
  return (
    <main className="container section">
      <Empty
        title="This page is yet to be written"
        text="The page you’re looking for could not be found."
        action={
          <Link className="button btn" to="/">
            Back to the journal <ArrowRight size={16} />
          </Link>
        }
      />
    </main>
  );
}
export default NotFound;
