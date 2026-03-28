'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';

export default function SignupClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  const [plan, setPlan] = useState<'free' | 'managed'>('managed');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, plan }),
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
        callbackUrl:
          plan === 'managed' ? '/dashboard?upgrade=true' : '/dashboard',
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
            We'll send a sign-in link to{' '}
            <span className="text-cyber-blue">{email}</span>
          </p>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full py-4 rounded-sm bg-cyber-blue text-black font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_30px_rgba(0,224,255,0.2)]"
          >
            {loading
              ? 'Sending...'
              : plan === 'managed'
                ? 'Complete Managed Setup'
                : 'Send Sign-In Link'}
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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 py-20">
      <div className="max-w-xl w-full glass-card p-10 border-cyber-blue/30 shadow-[0_0_100px_rgba(0,224,255,0.1)]">
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
            {'>'} Managed Agentic Swarm
          </p>
        </div>

        {/* Plan Selection */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setPlan('managed')}
            className={`p-4 rounded-sm border transition-all text-left relative overflow-hidden group ${
              plan === 'managed'
                ? 'bg-cyber-blue/10 border-cyber-blue shadow-[0_0_20px_rgba(0,224,255,0.1)]'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-[10px] font-mono uppercase tracking-widest ${plan === 'managed' ? 'text-cyber-blue' : 'text-zinc-500'}`}
                >
                  Managed Node
                </span>
                {plan === 'managed' && (
                  <Zap className="w-3 h-3 text-cyber-blue fill-cyber-blue" />
                )}
              </div>
              <p className="text-lg font-black text-white italic">
                $29
                <span className="text-xs text-zinc-500 font-normal">/mo</span>
              </p>
            </div>
            {plan === 'managed' && (
              <div className="absolute inset-0 bg-gradient-to-br from-cyber-blue/5 to-transparent pointer-events-none" />
            )}
          </button>

          <button
            onClick={() => setPlan('free')}
            className={`p-4 rounded-sm border transition-all text-left ${
              plan === 'free'
                ? 'bg-zinc-800 border-zinc-500 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span
                className={`text-[10px] font-mono uppercase tracking-widest ${plan === 'free' ? 'text-white' : 'text-zinc-500'}`}
              >
                Free Tier
              </span>
            </div>
            <p className="text-lg font-black text-white italic">$0</p>
          </button>
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
            {loading
              ? 'Creating...'
              : plan === 'managed'
                ? 'Start One-Click Setup'
                : 'Create Free Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div
          className={`mt-10 p-6 rounded-sm border transition-colors ${plan === 'managed' ? 'bg-cyber-blue/5 border-cyber-blue/20' : 'bg-white/[0.02] border-white/10'}`}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap
              className={`w-4 h-4 ${plan === 'managed' ? 'text-cyber-blue' : 'text-zinc-500'}`}
            />
            <span
              className={`text-[10px] font-mono uppercase tracking-widest font-bold ${plan === 'managed' ? 'text-cyber-blue' : 'text-zinc-400'}`}
            >
              {plan === 'managed'
                ? 'Managed Node Benefits'
                : 'Free Tier Includes'}
            </span>
          </div>
          <ul className="text-xs text-zinc-400 space-y-3 font-mono">
            {plan === 'managed' ? (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-cyber-blue">●</span>
                  <span>Dedicated AWS Managed Node (Isolated)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyber-blue">●</span>
                  <span>Unlimited Repositories & Scans</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyber-blue">●</span>
                  <span>$10 Monthly AI Fuel Allowance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyber-blue">●</span>
                  <span>Autonomous Remediations & Push access</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-600">●</span>
                  <span>3 public repositories</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-600">●</span>
                  <span>10 analysis runs / month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-600">●</span>
                  <span>$5 welcome AI credit</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="mt-8 text-center border-t border-white/5 pt-8">
          <p className="text-xs text-zinc-500 font-mono">
            Already have an account?{' '}
            <Link href="/login" className="text-cyber-blue hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {error && (
          <p className="mt-6 text-red-400 text-xs text-center font-mono bg-red-400/10 py-3 border border-red-400/20 rounded-sm">
            [ERROR]: {error}
          </p>
        )}
      </div>
    </div>
  );
}
