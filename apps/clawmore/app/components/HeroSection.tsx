'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Activity } from 'lucide-react';

interface HeroSectionProps {
  onOpenBeta: () => void;
}

export default function HeroSection({ onOpenBeta }: HeroSectionProps) {
  return (
    <section className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/5 isolate py-14 sm:py-20">
      {/* Cinematic Background Image */}
      <div className="absolute inset-0 -z-20 bg-[#0a0a0a]">
        <Image
          src="/hero.png"
          alt="Hero Background"
          fill
          className="object-cover blur-[0.5px] brightness-[0.9] saturate-[1.1]"
          priority
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(10,10,10,0.4)_40%,_#0a0a0a_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-black/30 opacity-70" />
      </div>

      {/* Global Diffuse Blur Layer */}
      <div
        className="absolute inset-0 -z-10 backdrop-blur-[30px] bg-black/40 pointer-events-none"
        style={{
          maskImage:
            'radial-gradient(circle at center, black 0%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(circle at center, black 0%, transparent 80%)',
        }}
      />

      <div className="container mx-auto px-4 relative flex flex-col items-center text-center -mt-8 sm:-mt-14 md:-mt-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_rgba(0,224,255,0.3)_0%,_transparent_60%)] blur-[100px] opacity-70" />

        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-sm border border-cyber-blue/40 bg-cyber-blue/10 text-cyber-blue text-[10px] font-mono uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-6 sm:mb-12 shadow-[0_0_30px_rgba(0,224,255,0.15)] backdrop-blur-sm animate-current-flow">
          <Activity className="w-3 h-3" />
          <span>Automated AWS Management • AI-Powered Fixes</span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-4 sm:mb-10 bg-gradient-to-r from-[#00e0ff] to-[#bc00ff] bg-clip-text text-transparent leading-[1.1] sm:leading-[1.1] pb-3 sm:pb-4 drop-shadow-[0_10px_60px_rgba(0,0,0,1)]">
          ClawMore: OpenClaw but More
          <br />
          <span className="italic text-2xl sm:text-4xl md:text-5xl lg:text-6xl block mt-4 opacity-90">
            the self evolving, infinitely scaling, never dying claw.
          </span>
        </h1>

        <p className="text-xl sm:text-2xl text-white/90 max-w-4xl mx-auto mb-10 sm:mb-14 leading-relaxed font-light drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
          The first autonomous system for{' '}
          <strong>Multi-Human Multi-Agent Collaboration</strong>. OpenClaw
          automatically synthesizes, optimizes, and evolves your AWS
          infrastructure through agentic swarms that scale only when needed.
        </p>

        <div className="w-full max-w-lg sm:max-w-none flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 sm:gap-8">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 rounded-sm bg-white text-black hover:bg-cyber-blue transition-all font-black uppercase tracking-widest flex items-center justify-center gap-3 group shadow-[0_0_50px_rgba(255,255,255,0.2)] text-center"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button
            onClick={onOpenBeta}
            className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 rounded-sm border border-white/20 bg-white/5 hover:bg-white/10 transition-all font-bold uppercase tracking-widest text-[13px] sm:text-[14px] backdrop-blur-md"
          >
            See Live Demo
          </button>
        </div>
      </div>
    </section>
  );
}
