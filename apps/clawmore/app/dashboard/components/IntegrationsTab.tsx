import React from 'react';
import {
  MessageSquare,
  Send,
  Bell,
  Settings,
  ExternalLink,
} from 'lucide-react';

interface IntegrationsTabProps {
  status: any;
}

export default function IntegrationsTab({ status }: IntegrationsTabProps) {
  const [telegramToken, setTelegramToken] = React.useState(
    status.telegramBotToken || ''
  );
  const [slackUrl, setSlackUrl] = React.useState(status.slackWebhookUrl || '');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async (updates: any) => {
    setIsSaving(true);
    try {
      await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Failed to save integrations:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h2 className="text-2xl font-black italic tracking-tight text-white uppercase mb-2">
            Communication <span className="text-cyber-blue">Channels</span>
          </h2>
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-zinc-500">
            Connect your swarm to your team's workflow
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Telegram Integration */}
        <div className="bg-black/60 p-8 rounded-[32px] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Send className="w-20 h-20 text-[#229ED9]" />
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#229ED9]/10 border border-[#229ED9]/20 flex items-center justify-center">
              <Send className="w-6 h-6 text-[#229ED9]" />
            </div>
            <div>
              <h3 className="text-lg font-black italic text-white uppercase tracking-tight">
                Telegram Bot
              </h3>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
                Real-time mutation logs
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest ml-1">
                Bot Token
              </label>
              <input
                type="password"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="123456789:ABCDEF..."
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-800 focus:outline-none focus:border-cyber-blue transition-colors"
              />
            </div>

            <button
              onClick={() => handleSave({ telegramBotToken: telegramToken })}
              disabled={isSaving}
              className="w-full py-4 bg-[#229ED9] hover:bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              {isSaving ? 'Saving...' : 'Connect Telegram Bot'}
            </button>
          </div>
        </div>

        {/* Slack Integration */}
        <div className="bg-black/60 p-8 rounded-[32px] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <MessageSquare className="w-20 h-20 text-[#4A154B]" />
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#4A154B]/10 border border-[#4A154B]/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#4A154B]" />
            </div>
            <div>
              <h3 className="text-lg font-black italic text-white uppercase tracking-tight">
                Slack Webhook
              </h3>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
                Team collaboration channel
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest ml-1">
                Webhook URL
              </label>
              <input
                type="text"
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-800 focus:outline-none focus:border-cyber-blue transition-colors"
              />
            </div>

            <button
              onClick={() => handleSave({ slackWebhookUrl: slackUrl })}
              disabled={isSaving}
              className="w-full py-4 border border-zinc-800 hover:border-white text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Integration'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col sm:flex-row gap-8 items-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
          <Bell className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="flex-grow text-center sm:text-left">
          <h4 className="text-lg font-black italic text-white uppercase mb-2">
            System Notification Engine
          </h4>
          <p className="text-xs text-zinc-500 font-mono leading-relaxed max-w-xl">
            Notifications are sent using the **Zero-Wait** protocol. We
            broadcast to all connected channels simultaneously to ensure minimum
            latency during human-in-the-loop validation events.
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <span className="flex items-center gap-2 text-[9px] font-mono text-emerald-500/70 border border-emerald-500/20 px-3 py-1 rounded-full uppercase">
              <Settings className="w-3 h-3" /> Event Filtering
            </span>
            <span className="flex items-center gap-2 text-[9px] font-mono text-emerald-500/70 border border-emerald-500/20 px-3 py-1 rounded-full uppercase">
              <ExternalLink className="w-3 h-3" /> Webhook Security
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
