'use client';

import { motion } from 'framer-motion';
import { getSeverityColor, getTypeIcon } from '../lib/utils';

interface ScanIssue {
  id: number;
  type: 'duplicate' | 'context' | 'consistency';
  file: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

interface ScanIssueCardProps {
  issue: ScanIssue;
  index: number;
}

export default function ScanIssueCard({ issue, index }: ScanIssueCardProps) {
  const colors = getSeverityColor(issue.severity);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, x: 5 }}
      className={`relative border ${colors.border} rounded-xl p-4 backdrop-blur-md ${colors.bg} ${colors.glow} group cursor-pointer overflow-hidden shadow-lg`}
    >
      {/* Animated scan line effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 5,
          ease: 'linear',
        }}
      />

      <div className="flex items-start gap-3 relative z-10">
        <motion.div
          animate={{ rotate: [0, 10, 0, -10, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        >
          {getTypeIcon(issue.type)}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${colors.badge}`}
            >
              {issue.severity}
            </span>
            <div className="h-px w-2 bg-slate-600" />
            <span className="text-xs text-slate-500 font-mono truncate">
              {issue.file}
            </span>
          </div>
          <p className={`text-sm font-medium ${colors.text} leading-relaxed`}>
            {issue.message}
          </p>

          {/* Progress indicator */}
          <motion.div
            className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className={`h-full ${colors.text.replace('text-', 'bg-')}`}
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1, delay: index * 0.2 }}
              style={{ boxShadow: `0 0 8px currentColor` }}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
