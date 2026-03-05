'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { Search } from 'lucide-react';
import ScanScore from './ScanScore';
import ScanStatus from './ScanStatus';
import ScanIssueCard from './ScanIssueCard';

interface ScanIssue {
  id: number;
  type: 'duplicate' | 'context' | 'consistency';
  file: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

const issuesList: ScanIssue[] = [
  {
    id: 1,
    type: 'duplicate',
    file: 'src/utils/helpers.ts',
    severity: 'high',
    message: 'Semantic duplicate detected',
  },
  {
    id: 2,
    type: 'context',
    file: 'src/components/Auth.tsx',
    severity: 'medium',
    message: 'Context fragmentation detected',
  },
  {
    id: 3,
    type: 'consistency',
    file: 'src/api/users.ts',
    severity: 'high',
    message: 'Inconsistent naming pattern',
  },
  {
    id: 4,
    type: 'duplicate',
    file: 'src/lib/validation.ts',
    severity: 'medium',
    message: 'Similar logic found in 3 files',
  },
  {
    id: 5,
    type: 'context',
    file: 'src/services/payment.ts',
    severity: 'low',
    message: 'High context window cost',
  },
  {
    id: 6,
    type: 'consistency',
    file: 'src/models/Product.ts',
    severity: 'medium',
    message: 'Style inconsistency detected',
  },
];

export default function LiveScanDemo() {
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visibleIssues, setVisibleIssues] = useState<ScanIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });

  useEffect(() => {
    if (!isInView) {
      setScore(0);
      setProgress(0);
      setVisibleIssues([]);
      setIsScanning(false);
      return;
    }

    setIsScanning(true);

    const scoreInterval = setInterval(() => {
      setScore((prev) => {
        if (prev >= 67) {
          clearInterval(scoreInterval);
          return 67;
        }
        return prev + 1;
      });
    }, 30);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsScanning(false);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    issuesList.forEach((issue, index) => {
      setTimeout(
        () => {
          setVisibleIssues((prev) => [...prev, issue]);
        },
        300 + index * 200
      );
    });

    return () => {
      clearInterval(scoreInterval);
      clearInterval(progressInterval);
    };
  }, [isInView]);

  return (
    <section
      ref={ref}
      className="py-20 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
        }}
      />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Real-Time Scanning
            </span>
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-6">
            Watch AIReady analyze your codebase and surface issues that confuse
            AI models.
          </p>
          <motion.a
            href="https://platform.getaiready.dev/metrics"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 text-cyan-400 font-bold hover:text-cyan-300 transition-colors group"
          >
            Learn about our AI Readiness methodology
            <span className="group-hover:translate-x-1 transition-transform">
              →
            </span>
          </motion.a>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={
              isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }
            }
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center justify-center"
          >
            <ScanScore score={score} progress={progress} isInView={isInView} />
            <ScanStatus isScanning={isScanning} isInView={isInView} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 mb-6">
              <motion.div
                className="w-2 h-2 bg-cyan-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  boxShadow: [
                    '0 0 10px rgba(34, 211, 238, 0.5)',
                    '0 0 20px rgba(34, 211, 238, 0.8)',
                    '0 0 10px rgba(34, 211, 238, 0.5)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                ISSUES DETECTED
              </h3>
              <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
            </div>

            <div className="relative overflow-hidden">
              {/* Sci-fi border effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-blue-500/10 rounded-xl blur-sm" />

              <div className="relative space-y-3 max-h-[450px] overflow-y-auto overflow-x-hidden p-1 pr-3 scrollbar-thin">
                {visibleIssues.map((issue, index) => (
                  <ScanIssueCard key={issue.id} issue={issue} index={index} />
                ))}
              </div>
            </div>

            {visibleIssues.length === 0 && (
              <div className="text-center py-16 relative">
                {/* Radar effect */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="w-32 h-32 border-2 border-cyan-500/20 rounded-full" />
                </motion.div>
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="w-24 h-24 border-2 border-blue-500/20 rounded-full" />
                </motion.div>

                <div className="relative z-10">
                  <motion.div
                    className="flex justify-center mb-3"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Search className="w-12 h-12 text-cyan-400" />
                  </motion.div>
                  <p className="text-sm font-mono text-cyan-400/60 uppercase tracking-wider">
                    Initializing scan sequence...
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-1 bg-cyan-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.3,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
