'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setRegistered(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('email', {
        email,
        callbackUrl: '/dashboard',
        redirect: true,
      });
    } catch {
      setError('Failed to send magic link');
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card p-10 border-cyber-blue/30 shadow-[0_0_100px_rgba(0,224,255,0.1)] text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
            <svg
              className="w-8 h-8 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Account Created
          </h2>
          <p className="text-zinc-400 text-sm mb-8 font-mono">
            We&apos;ll send a sign-in link to{' '}
            <span className="text-cyber-blue">{email}</span>
          </p>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full py-4 rounded-sm bg-cyber-blue text-black font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_30px_rgba(0,224,255,0.2)]"
          >
            {loading ? 'Sending...' : 'Send Sign-In Link'}
          </button>
          <Link
            href="/login"
            className="block mt-6 text-xs text-zinc-500 hover:text-white transition-colors font-mono uppercase tracking-widest"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-card p-10 border-cyber-blue/30 shadow-[0_0_100px_rgba(0,224,255,0.1)]">
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logo.png"
            alt="ClawMore Logo"
            width={64}
            height={64}
            className="mb-6"
          />
          <h1 className="text-3xl font-black italic tracking-tighter text-white">
            Create Account
          </h1>
          <p className="text-zinc-500 text-sm mt-2 font-mono uppercase tracking-widest">
            {'>'} Start with $5 free credit
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2 ml-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-cyber-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2 ml-1">
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-cyber-blue transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-sm bg-cyber-blue text-black font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_30px_rgba(0,224,255,0.2)] flex items-center justify-center gap-2"
          >
            {loading ? 'Creating...' : 'Create Free Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 p-4 bg-purple-500/5 border border-purple-500/20 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold">
              Free Tier Includes
            </span>
          </div>
          <ul className="text-xs text-zinc-400 space-y-1 font-mono">
            <li> 3 repositories</li>
            <li> 10 analysis runs/month</li>
            <li> $5 welcome AI credit</li>
            <li> 7-day data retention</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-500 font-mono">
            Already have an account?{' '}
            <Link href="/login" className="text-cyber-blue hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {error && (
          <p className="mt-6 text-red-400 text-xs text-center font-mono">
            [ERROR]: {error}
          </p>
        )}
      </div>
    </div>
  );
}
