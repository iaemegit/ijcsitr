import { AdminProvider } from "../../../src/context/AdminContext";
import "../../../src/pages/admin/admin-theme.css";
import "../../../src/pages/admin/admin-typography.css";
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminProvider>{children}</AdminProvider>;
}
