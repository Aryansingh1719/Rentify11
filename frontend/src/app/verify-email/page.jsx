'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function VerifyEmailPage() {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/login'), 1000);
    return () => clearTimeout(timer);
  }, [router]);

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
            <h1 className="text-3xl font-black tracking-tighter text-foreground mb-2">Email verification disabled</h1>
            <p className="text-muted-foreground">Redirecting you to sign in.</p>
          </div>

          <Link
            href="/login"
            className="w-full inline-flex justify-center py-4 bg-primary text-primary-foreground rounded-2xl font-bold items-center gap-2 hover:opacity-90 transition-all shadow-xl"
          >
            Go to Sign In <ArrowRight size={18} />
          </Link>

          <div className="mt-8 text-center text-sm">
            <p className="text-muted-foreground">Email verification is temporarily turned off.</p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </main>
  );
}
