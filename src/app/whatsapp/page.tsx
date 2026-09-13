import { Suspense } from 'react';
import AdminShell from '@/components/AdminShell';
import AdminWhatsApp from '@/components/AdminWhatsApp';

export default function Page() {
  return (
    <AdminShell>
      <Suspense fallback={null}>
        <AdminWhatsApp />
      </Suspense>
    </AdminShell>
  );
}
