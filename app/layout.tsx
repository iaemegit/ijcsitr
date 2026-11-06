import type { Metadata } from "next";
import { Suspense } from "react";
import Providers from "../src/components/Providers";
import "bootstrap/dist/css/bootstrap.min.css";
import "../src/styles.css";
import "../src/pages/admin/admin.css";
import "../src/pages/admin/discipline/discipline.css";
import "../src/pages/admin/affiliation/affiliation.css";
import "../src/pages/admin/author/author.css";
import "../src/pages/admin/journal/journal.css";
import "../src/pages/admin/journal-issue/journal-issue.css";
export const metadata: Metadata = {
  title: "IJCSITR | Computer Science & IT Research",
  description:
    "International Journal of Computer Science and Information Technology Research",
  icons: { icon: "/ijcsitr-logo.png", apple: "/ijcsitr-logo.png" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="admin-loading">Loading...</div>}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
