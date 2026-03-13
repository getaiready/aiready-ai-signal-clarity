'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Hash,
  Terminal,
  Activity,
  RefreshCcw,
  ShieldCheck,
  Cpu,
  Zap,
  ChevronRight,
  GitBranch,
  Layers,
} from 'lucide-react';
import BlogHero from '../../components/BlogHero';
import BlogCard from '../../components/BlogCard';
import Modal from '../../../components/Modal';
import LeadForm from '../../../components/LeadForm';
import SystemFlow from '../../../components/SystemFlow';

const FLOW_NODES = [
  {
    id: 'reflector',
    data: { label: '[REFLECTOR]', type: 'agent' },
    position: { x: 0, y: 0 },
  },
  {
    id: 'bus',
    data: { label: 'NEURAL_BUS_STREAM', type: 'bus' },
    position: { x: 250, y: 0 },
  },
  {
    id: 'architect',
    data: { label: '[ARCHITECT]', type: 'agent' },
    position: { x: 500, y: -50 },
  },
  {
    id: 'coder',
    data: { label: '[CODER]', type: 'agent' },
    position: { x: 500, y: 50 },
  },
  {
    id: 'event1',
    data: { label: 'GAP_DETECTED', type: 'event' },
    position: { x: 125, y: -30 },
  },
  {
    id: 'event2',
    data: { label: 'PATCH_PLANNED', type: 'event' },
    position: { x: 375, y: -30 },
  },
  {
    id: 'event3',
    data: { label: 'GIT_COMMIT', type: 'event' },
    position: { x: 375, y: 30 },
  },
];

const FLOW_EDGES = [
  { id: 'e1', source: 'reflector', target: 'bus', animated: true },
  { id: 'e2', source: 'bus', target: 'architect', animated: true },
  { id: 'e3', source: 'bus', target: 'coder', animated: true },
];

export default function BlogPost() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const apiUrl = process.env.NEXT_PUBLIC_LEAD_API_URL || '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-cyber-purple/30 selection:text-cyber-purple font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/5">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="ClawMore Logo"
              width={32}
              height={32}
              className="drop-shadow-[0_0_8px_rgba(188,0,255,0.6)]"
            />
            <span className="text-xl font-bold tracking-tight italic glow-text">
              ClawMore
            </span>
          </Link>
          <div className="flex items-center gap-8 text-[11px] font-mono uppercase tracking-widest text-zinc-500">
            <Link
              href="/blog"
              className="hover:text-cyber-purple transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Journal
            </Link>
          </div>
        </div>
      </nav>

      {/* Article Header */}
      <header className="py-24 border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_rgba(188,0,255,0.05)_0%,_transparent_70%)] opacity-30" />

        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="text-cyber-purple font-mono text-[9px] uppercase tracking-[0.4em] font-black border border-cyber-purple/20 px-2 py-1 bg-cyber-purple/5">
                NETWORK_SPINE
              </div>
              <div className="flex items-center gap-1.5 text-zinc-600 font-mono text-[9px]">
                <Hash className="w-3 h-3" />
                <span>HASH: 915c10e</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-600 font-mono text-[9px]">
                <Clock className="w-3 h-3" />
                <span>08 MIN READ</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 italic leading-[1.1]">
              EventBridge: The <br />
              <span className="text-cyber-purple">Neural Spine</span>
            </h1>

            <p className="text-xl text-zinc-400 font-light leading-relaxed italic">
              Mapping the ClawFlow mesh. How asynchronous events allow decoupled
              agents to coordinate without a central controller.
            </p>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <main className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <article className="prose prose-invert prose-zinc max-w-none">
              <div className="space-y-12">
                <section>
                  <h2 className="text-3xl font-black tracking-tight mb-6 flex items-center gap-4">
                    <span className="text-cyber-purple font-mono text-sm">
                      01
                    </span>
                    The Monolith Problem
                  </h2>
                  <p className="text-zinc-400 leading-relaxed text-lg">
                    Traditional automation scripts are monolithic. They follow a
                    rigid, linear execution path: *A must finish before B can
                    start.* In the world of autonomous infrastructure, this is
                    fatal. If the Coder agent is busy committing a patch, the
                    Reflector shouldn't stop monitoring for new gaps.
                  </p>
                  <p className="text-zinc-400 leading-relaxed text-lg mt-6">
                    We needed a nervous system—a way for agents to "pulse" their
                    intent across the entire cluster without waiting for a
                    response.
                  </p>
                </section>

                <section>
                  <h2 className="text-3xl font-black tracking-tight mb-6 flex items-center gap-4">
                    <span className="text-cyber-purple font-mono text-sm">
                      02
                    </span>
                    ClawFlow: Decoupled Autonomy
                  </h2>
                  <p className="text-zinc-400 leading-relaxed text-lg">
                    Enter **ClawFlow**. Built on AWS EventBridge, it's a
                    decentralized mesh where every action is a discrete event.
                    When the Reflector identifies a performance bottleneck, it
                    doesn't "call" the Architect. It emits a `GAP_DETECTED`
                    event to the neural spine.
                  </p>
                  <p className="text-zinc-400 leading-relaxed text-lg mt-6">
                    Any agent tuned to that frequency can react. The Architect
                    picks up the signal, designs a solution, and pulses a
                    `MUTATION_PLANNED` event.
                  </p>
                </section>

                <SystemFlow nodes={FLOW_NODES} edges={FLOW_EDGES} />

                <section>
                  <h2 className="text-3xl font-black tracking-tight mb-6 flex items-center gap-4">
                    <span className="text-cyber-purple font-mono text-sm">
                      03
                    </span>
                    Unlimited Breadth
                  </h2>
                  <p className="text-zinc-400 leading-relaxed text-lg">
                    This asynchronous nature gives `serverlessclaw` what we call
                    **Unlimited Breadth**. Because there is no central
                    controller, we can scale sub-agents horizontally across the
                    AWS global infrastructure. A mutation happening in
                    `ap-southeast-2` can trigger a security reflection in
                    `us-east-1` in milliseconds.
                  </p>
                </section>

                <section>
                  <h2 className="text-3xl font-black tracking-tight mb-6 flex items-center gap-4">
                    <span className="text-cyber-purple font-mono text-sm">
                      04
                    </span>
                    The Next Evolution
                  </h2>
                  <p className="text-zinc-400 leading-relaxed text-lg">
                    Having a neural spine is one thing; having a "conscience" is
                    another. In the next post, we'll explore **The
                    Reflector**—the autonomous critique mechanism that ensures
                    the engine doesn't just act, but understands *why* it acts.
                  </p>
                </section>
              </div>

              {/* Series Navigation */}
              <div className="mt-24 pt-12 border-t border-white/5">
                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.4em] mb-8">
                  Up_Next_In_The_Cycle
                </div>
                <Link
                  href="/blog/the-reflector-self-critique"
                  className="block group"
                >
                  <div className="glass-card p-8 flex items-center justify-between hover:border-cyber-purple/30 transition-all bg-white/[0.01]">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-sm bg-cyber-purple/10 flex items-center justify-center text-cyber-purple border border-cyber-purple/20">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-cyber-purple uppercase tracking-widest mb-1">
                          PART 03 // SAFETY_GUARDS
                        </div>
                        <div className="text-2xl font-black italic group-hover:text-white transition-colors">
                          The Reflector: Machines that Self-Critique
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-zinc-700 group-hover:text-cyber-purple group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </div>
            </article>
          </div>
        </div>
      </main>

      {/* Subscription Section */}
      <section className="py-24 bg-cyber-purple/[0.02] border-y border-white/5">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-black italic mb-6">Stay Synchronized</h3>
          <p className="text-zinc-500 mb-10 max-w-lg mx-auto text-sm">
            Join 1,200+ architects receiving autonomous mutation logs and
            technical deep dives weekly.
          </p>
          <button
            onClick={openModal}
            className="px-10 py-4 bg-white text-black font-black uppercase text-xs tracking-[0.3em] hover:bg-cyber-purple transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]"
          >
            Join Mutation_List
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-black">
        <div className="container mx-auto px-4 text-center text-zinc-700 text-[10px] font-mono uppercase tracking-[0.5em]">
          TERMINAL_LOCKED // 2026 PERPETUAL_EVOLUTION
        </div>
      </footer>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <LeadForm type="waitlist" onSuccess={closeModal} apiUrl={apiUrl} />
      </Modal>
    </div>
  );
}
