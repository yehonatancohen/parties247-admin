import AdminShell from '@/components/AdminShell';
import AdminAuditLog from '@/components/AdminAuditLog';

export default function Page() {
  return (
    <AdminShell>
      <AdminAuditLog />
    </AdminShell>
  );
}
