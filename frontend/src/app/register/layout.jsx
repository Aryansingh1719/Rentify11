import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function RegisterLayout({ children }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
