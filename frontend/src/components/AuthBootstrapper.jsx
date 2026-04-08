'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { fetchMe } from '@/store/slices/authSlice';
import { setAuthSession } from '@/lib/api';

/**
 * Rehydrates auth: Bearer token from localStorage (interceptor) + optional OAuth hash on return URL.
 */
export default function AuthBootstrapper() {
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    let fromOAuthHash = false;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash?.startsWith('#token=')) {
        fromOAuthHash = true;
        const raw = hash.slice(7);
        try {
          const token = decodeURIComponent(raw);
          if (token) setAuthSession(token);
        } catch {
          /* ignore malformed hash */
        }
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
    dispatch(fetchMe())
      .unwrap()
      .then((user) => {
        if (fromOAuthHash && user) {
          router.replace(user.role === 'renter' ? '/discover' : '/dashboard');
        }
      })
      .catch(() => {
        // Unauthenticated is a valid state
      });
  }, [dispatch, router]);

  return null;
}

