'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Terminal, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface ProvisioningConsoleProps {
  status: 'provisioning' | 'complete' | 'failed' | 'none';
  error?: string;
}

const STEPS = [
  {
    id: 'aws-account',
    label: 'AWS Account Vending',
    description: 'Leasing managed node from warm pool...',
  },
  {
    id: 'gov-policy',
    label: 'Governance Setup',
    description: 'Applying Zero-Idle SCP & Security Hub...',
  },
  {
    id: 'iam-bootstrap',
    label: 'IAM Bootstrapping',
    description: 'Creating management roles and trust relations...',
  },
  {
    id: 'github-clone',
    label: 'Spoke Provisioning',
    description: 'Cloning serverlessclaw template into private repo...',
  },
  {
    id: 'incident-bus',
    label: 'Shadow Bus Link',
    description: 'Connecting cross-account EventBridge for mutation tax...',
  },
  {
    id: 'secrets-inject',
    label: 'Secrets Injection',
    description: 'Securing AWS and AI provider credentials...',
  },
];

export default function ProvisioningConsole({
  status,
  error,
}: ProvisioningConsoleProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const appendLog = React.useCallback((msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (status !== 'provisioning') {
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) {
          const next = prev + 1;
          appendLog(`> Initiating: ${STEPS[next].label}...`);
          return next;
        }
        return prev;
      });
    }, 15000); // Progress roughly every 15s to fill the 2-3 min gap

    setTimeout(() => {
      appendLog('> Bootstrapping Orchestrator v0.3.17...');
      appendLog(`> Target: Managed Node Generation...`);
      appendLog(`> Step 1: ${STEPS[0].label} - ${STEPS[0].description}`);
    }, 0);

    return () => clearInterval(interval);
  }, [status, appendLog]);

  useEffect(() => {
    if (status === 'complete') {
      setTimeout(() => {
        appendLog('✔️ ALL SYSTEMS OPERATIONAL. REDIRECTING TO HUB...');
      }, 0);
    }
  }, [status, appendLog]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (status === 'none') return null;

  return (
    <div className="w-full bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl font-mono animate-in fade-in zoom-in duration-500">
      {/* Terminal Title Bar */}
      <div className="bg-zinc-900 px-4 py-2 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyber-blue" />
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            provisioning_console.sys
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
          <div className="w-2 h-2 rounded-full bg-cyber-blue animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[400px]">
        {/* Progress Column */}
        <div className="p-6 border-r border-white/5 space-y-6 bg-zinc-950/50">
          <h3 className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-4">
            Deployment Pipeline
          </h3>
          {STEPS.map((step, i) => {
            const isCompleted = i < currentStep || status === 'complete';
            const isActive = i === currentStep && status === 'provisioning';
            const isFailed = status === 'failed' && i === currentStep;

            return (
              <div key={step.id} className="flex gap-3 items-start group">
                <div className="mt-0.5 relative">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-cyber-blue animate-spin" />
                  ) : isFailed ? (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/10" />
                  )}
                  {i < STEPS.length - 1 && (
                    <div
                      className={`absolute top-4 left-2 w-[1px] h-6 ${isCompleted ? 'bg-emerald-500/50' : 'bg-white/5'}`}
                    />
                  )}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-bold uppercase tracking-tight ${isActive ? 'text-cyber-blue' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'}`}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <span className="text-[9px] text-zinc-500 leading-tight mt-0.5 animate-pulse">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Log Output Column */}
        <div className="lg:col-span-2 p-6 flex flex-col bg-black">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
              StdOut Feed
            </h3>
            <span className="text-[9px] text-cyber-blue/50 font-mono italic">
              KERNEL v4.22-SST
            </span>
          </div>

          <div
            ref={scrollRef}
            className="flex-grow overflow-y-auto space-y-1 mb-4 h-[300px] scrollbar-hide"
          >
            {logs.map((log, i) => (
              <p key={i} className="text-[11px] leading-relaxed break-all">
                <span className="text-zinc-800">{log.split(']')[0]}]</span>
                <span
                  className={
                    log.includes('✔️')
                      ? 'text-emerald-500'
                      : log.includes('>')
                        ? 'text-cyber-blue'
                        : 'text-zinc-400'
                  }
                >
                  {log.split(']')[1]}
                </span>
              </p>
            ))}
            {status === 'provisioning' && (
              <div className="flex items-center gap-2 text-[11px] text-cyber-blue">
                <span className="animate-pulse">_</span>
              </div>
            )}
            {status === 'failed' && (
              <p className="text-[11px] text-rose-500 mt-4 font-bold border-t border-rose-500/20 pt-4">
                [FATAL_ERROR]:{' '}
                {error ||
                  'Provisioning sequence aborted. Check IAM permissions.'}
              </p>
            )}
          </div>

          <div className="mt-auto bg-zinc-900/50 p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              <span>Overall Progress</span>
              <span className="text-cyber-blue font-bold">
                {status === 'complete'
                  ? '100'
                  : Math.round((currentStep / STEPS.length) * 100)}
                %
              </span>
            </div>
            <div className="mt-2 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${status === 'failed' ? 'bg-rose-500' : 'bg-cyber-blue shadow-[0_0_10px_rgba(0,224,255,0.5)]'}`}
                style={{
                  width: `${status === 'complete' ? 100 : (currentStep / STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
