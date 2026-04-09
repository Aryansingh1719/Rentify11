'use client';

import { useState, useEffect } from 'react';
import api, { APIBaseUrl, setAuthSession, clearAuthSession } from '@/lib/api';
import { useDispatch } from 'react-redux';
import { fetchMe } from '@/store/slices/authSlice';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const ERROR_MESSAGES = {
  google_cancelled: 'You cancelled the Google sign-in.',
  google_failed: 'Google sign-in failed. Please try again.',
  invalid_callback: 'Invalid callback. Please try again.',
  invalid_state: 'Security check failed. Please try again.',
  oauth_not_configured: 'Google sign-in is not configured.',
  token_exchange_failed: 'Could not complete sign-in. Please try again.',
  userinfo_failed: 'Could not fetch your profile. Please try again.',
  no_email: 'Google did not provide an email.',
  account_blocked: 'This account has been blocked.',
  server_error: 'Something went wrong. Please try again.',
};

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('renter');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast.error(ERROR_MESSAGES[error] || 'Sign-in failed. Please try again.');
      router.replace('/register', { scroll: false });
    }
  }, [searchParams, router]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    let storedToken = false;

    try {
      const res = await api.post('/api/auth/register', {
        name,
        email,
        password,
        role,
      });

      if (res.data?.token) {
        setAuthSession(res.data.token);
        storedToken = true;
      }
      await dispatch(fetchMe()).unwrap();
      toast.success(res.data?.message || 'Account created successfully');
      router.push(res.data?.redirect || (res.data?.user?.role === 'seller' ? '/seller/dashboard' : '/dashboard'));
    } catch (err) {
      if (storedToken) clearAuthSession();
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="flex items-center justify-center min-h-screen pt-24 px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card rounded-[40px] shadow-xl dark:shadow-black/40 p-10 border border-border"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tighter text-foreground mb-2">
              Create Account
            </h1>
            <p className="text-muted-foreground">
              Join the premium rental community today
            </p>
          </div>

          {/* Role Toggle */}
          <div className="flex p-1 bg-muted rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => setRole('renter')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                role === 'renter'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Renter
            </button>

            <button
              type="button"
              onClick={() => setRole('seller')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                role === 'seller'
                  ? 'bg-card text-emerald-600 dark:text-cyan-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Seller
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleRegister} className="space-y-6">

            {/* NAME */}
            <div className="space-y-2">
              <label htmlFor="register-name" className="text-sm font-bold text-foreground ml-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-input border border-border rounded-2xl outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {/* EMAIL */}
            <div className="space-y-2">
              <label htmlFor="register-email" className="text-sm font-bold text-foreground ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-input border border-border rounded-2xl outline-none"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <label htmlFor="register-password" className="text-sm font-bold text-foreground ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-input border border-border rounded-2xl outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Create Account <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* GOOGLE */}
            <a
              href={`${APIBaseUrl}/api/auth/google`}
              className="w-full py-3.5 px-4 rounded-2xl border border-border flex items-center justify-center gap-3 font-bold"
            >
              Continue with Google
            </a>
          </form>

          {/* LOGIN LINK */}
          <div className="mt-8 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}