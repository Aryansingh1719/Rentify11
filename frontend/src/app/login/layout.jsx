import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function LoginLayout({ children }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
