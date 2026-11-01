import React from 'react';
import { MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { playClickSound } from '../utils/audio';

interface WelcomeCardProps {
  onStartChat: () => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ onStartChat }) => {
  const { user } = useAuth();

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl p-5 sm:p-7 bg-gradient-to-r from-[#06102b]/90 via-[#071336]/80 to-[#12082b]/90 border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.18)] backdrop-blur-xl overflow-hidden">
      {/* Cybernetic Accent Corners & Neon Highlights */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-400 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-400 pointer-events-none" />

      {/* Background Subtle Cyber Glow */}
      <div className="absolute -left-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left Side: Avatar, Dynamic Greeting & Call-To-Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 w-full lg:w-auto">
          {/* Avatar with Cyber Neon Ring */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-[2px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <img
                src={
                  user.avatar ||
                  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80'
                }
                alt={user.name}
                className="w-full h-full rounded-[14px] object-cover bg-slate-900"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                }}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 border-2 border-slate-950 flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-slate-950" />
            </div>
          </div>

          {/* Greeting text with user.name */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center flex-wrap gap-2">
              <span>Halo,</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                {user.name}
              </span>
              <span>👋</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              Selamat datang di <span className="font-orbitron font-bold text-cyan-300">NEXERA AI</span>
            </p>
            <p className="text-xs sm:text-sm text-slate-400 font-normal">
              AI Assistant pribadi kamu siap membantu.
            </p>

            {/* CTA Button: Mulai Chat */}
            <div className="pt-2">
              <button
                onClick={() => {
                  playClickSound();
                  onStartChat();
                }}
                className="group inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-semibold text-sm sm:text-base shadow-[0_0_20px_rgba(6,182,212,0.45)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] transition-all cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <span>Mulai Chat</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Futuristic Quote matching screenshot */}
        <div className="w-full lg:max-w-xs text-left lg:text-right pt-3 lg:pt-0 border-t border-slate-800/80 lg:border-t-0">
          <p className="text-xs sm:text-sm italic text-slate-300 leading-relaxed font-light">
            &ldquo;Teknologi terbaik adalah yang membuat hidupmu lebih mudah.&rdquo;
          </p>
          <p className="font-orbitron text-xs font-bold text-cyan-400/90 tracking-wider mt-1.5 uppercase">
            - NEXERA AI
          </p>
        </div>
      </div>
    </div>
  );
};
