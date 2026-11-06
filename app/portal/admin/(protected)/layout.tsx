import AdminLayout from "../../../../src/components/admin/AdminLayout";
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
