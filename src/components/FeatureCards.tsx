import React from 'react';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Eye, 
  User, 
  ArrowRight, 
  Sparkles, 
  ChevronRight, 
  Bot, 
  Smartphone,
  Users,
  Brain,
  Mic,
  BookOpen,
  PenTool
} from 'lucide-react';
import { TabType } from '../types';
import { playClickSound } from '../utils/audio';

interface FeatureCardsProps {
  onSelectTab: (tab: TabType) => void;
}

export const FeatureCards: React.FC<FeatureCardsProps> = ({ onSelectTab }) => {
  const features = [
    {
      id: 'chat' as TabType,
      title: 'Chat AI',
      description: 'Tanya apa saja dengan persona Gojo Satoru & Sasuke Uchiha.',
      icon: MessageSquare,
      color: 'blue',
      glowClass: 'border-blue-500/40 hover:border-blue-400 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]',
      iconBg: 'bg-blue-600/30 text-blue-400 border-blue-500/40',
      arrowBg: 'bg-blue-600/80 group-hover:bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)]',
      auraBg: 'from-blue-900/30 via-slate-900/80 to-[#040817]',
    },
    {
      id: 'image' as TabType,
      title: 'AI Image',
      description: 'Buat gambar dari deskripsi teks dengan AI.',
      icon: ImageIcon,
      color: 'purple',
      glowClass: 'border-purple-500/40 hover:border-purple-400 group-hover:shadow-[0_0_25px_rgba(168,85,247,0.35)]',
      iconBg: 'bg-purple-600/30 text-purple-400 border-purple-500/40',
      arrowBg: 'bg-purple-600/80 group-hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.6)]',
      auraBg: 'from-purple-900/30 via-slate-900/80 to-[#040817]',
    },
    {
      id: 'vision' as TabType,
      title: 'Vision AI',
      description: 'Analisis gambar, baca teks, dan temukan informasi bermanfaat.',
      icon: Eye,
      color: 'cyan',
      glowClass: 'border-cyan-500/40 hover:border-cyan-400 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.35)]',
      iconBg: 'bg-cyan-600/30 text-cyan-400 border-cyan-500/40',
      arrowBg: 'bg-cyan-600/80 group-hover:bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)]',
      auraBg: 'from-cyan-900/30 via-slate-900/80 to-[#040817]',
    },
    {
      id: 'agents' as TabType,
      title: 'AI Agent Builder',
      description: 'Rancang AI pribadi sendiri: nama, kepribadian, instruksi, dan avatar.',
      icon: Users,
      color: 'violet',
      badge: 'BARU',
      glowClass: 'border-violet-500/40 hover:border-violet-400 group-hover:shadow-[0_0_25px_rgba(139,92,246,0.35)]',
      iconBg: 'bg-violet-600/30 text-violet-400 border-violet-500/40',
      arrowBg: 'bg-violet-600/80 group-hover:bg-violet-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.6)]',
      auraBg: 'from-violet-950/40 via-slate-900/80 to-[#040817]',
    },
    {
      id: 'memory' as TabType,
      title: 'AI Memory',
      description: 'Memori konteks percakapan otomatis, kontrol privasi, dan kelola fakta.',
      icon: Brain,
      color: 'pink',
      badge: 'BARU',
      glowClass: 'border-pink-500/40 hover:border-pink-400 group-hover:shadow-[0_0_25px_rgba(236,72,153,0.35)]',
      iconBg: 'bg-pink-600/30 text-pink-400 border-pink-500/40',
      arrowBg: 'bg-pink-600/80 group-hover:bg-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.6)]',
      auraBg: 'from-pink-950/40 via-slate-900/80 to-[#040817]',
    },
    {
      id: 'voice' as TabType,
      title: 'AI Voice',
      description: 'Bicara interaktif lewat mic HP/browser dan dengarkan jawaban bersuara.',
      icon: Mic,
      color: 'rose',
      badge: 'BARU',
      glowClass: 'border-rose-500/40 hover:border-rose-400 group-hover:shadow-[0_0_25px_rgba(244,63,94,0.35)]',
      iconBg: 'bg-rose-600/30 text-rose-400 border-rose-500/40',
      arrowBg: 'bg-rose-600/80 group-hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)]',
      auraBg: 'from-rose-950/40 via-slate-900/80 to-[#040817]',
    },
    {
      id: 'knowledge' as TabType,
      title: 'AI Knowledge Base',
      description: 'Unggah PDF & dokumen, AI menjawab ketat berbasis isi dokumen tanpa halusinasi.',
      icon: BookOpen,
      color: 'teal',
      badge: 'BARU',
      glowClass: 'border-teal-500/40 hover:border-teal-400 group-hover:shadow-[0_0_25px_rgba(20,184,166,0.35)]',
      iconBg: 'bg-teal-600/30 text-teal-400 border-teal-500/40',
      arrowBg: 'bg-teal-600/80 group-hover:bg-teal-500 text-white shadow-[0_0_12px_rgba(20,184,166,0.6)]',
      auraBg: 'from-teal-950/40 via-slate-900/80 to-[#040817]',
    },
    {
      id: 'writing' as TabType,
      title: 'AI Writing Studio',
      description: 'Studio kreasi puisi, cerpen, novel, quotes, caption, esai & pengolah tulisan cerdas.',
      icon: PenTool,
      color: 'amber',
      badge: 'BARU',
      glowClass: 'border-amber-500/40 hover:border-amber-400 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.35)]',
      iconBg: 'bg-amber-600/30 text-amber-400 border-amber-500/40',
      arrowBg: 'bg-amber-600/80 group-hover:bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.6)]',
      auraBg: 'from-amber-950/40 via-slate-900/80 to-[#040817]',
    },
    {
      id: 'wabot' as TabType,
      title: 'WA Bot Builder',
      description: 'Buat bot WhatsApp kustom dengan kode AI, pairing code, dan sandbox.',
      icon: Bot,
      color: 'emerald',
      glowClass: 'border-emerald-500/40 hover:border-emerald-400 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.35)]',
      iconBg: 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40',
      arrowBg: 'bg-emerald-600/80 group-hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]',
      auraBg: 'from-emerald-950/40 via-slate-900/80 to-[#040817]',
    },
    {
      id: 'appbuilder' as TabType,
      title: 'AI App Builder',
      description: 'Bikin aplikasi web & Android (Capacitor APK) dari teks, preview live & export ZIP.',
      icon: Smartphone,
      color: 'indigo',
      glowClass: 'border-indigo-500/40 hover:border-indigo-400 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.35)]',
      iconBg: 'bg-indigo-600/30 text-indigo-400 border-indigo-500/40',
      arrowBg: 'bg-indigo-600/80 group-hover:bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)]',
      auraBg: 'from-indigo-950/40 via-slate-900/80 to-[#040817]',
    },
    {
      id: 'profil' as TabType,
      title: 'Profil',
      description: 'Kelola akun, pengaturan, dan informasi pribadi kamu.',
      icon: User,
      color: 'fuchsia',
      glowClass: 'border-fuchsia-500/40 hover:border-fuchsia-400 group-hover:shadow-[0_0_25px_rgba(217,70,239,0.35)]',
      iconBg: 'bg-fuchsia-600/30 text-fuchsia-400 border-fuchsia-500/40',
      arrowBg: 'bg-fuchsia-600/80 group-hover:bg-fuchsia-500 text-white shadow-[0_0_12px_rgba(217,70,239,0.6)]',
      auraBg: 'from-fuchsia-900/30 via-slate-900/80 to-[#040817]',
    },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
            Fitur Utama NEXERA
          </h2>
        </div>

        <button
          onClick={() => {
            playClickSound();
            onSelectTab('chat');
          }}
          className="flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer group"
        >
          <span>Buka Semua Fitur</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Grid of Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {features.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => {
                playClickSound();
                onSelectTab(item.id);
              }}
              className={`group relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-gradient-to-b ${item.auraBg} border border-slate-800 ${item.glowClass} transition-all duration-300 cursor-pointer flex flex-col justify-between h-[210px] sm:h-[220px] overflow-hidden active:scale-[0.98]`}
            >
              {/* Background anime subtle aura texture */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-all duration-500" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  {/* Icon box */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${item.iconBg} transition-transform group-hover:scale-105 duration-300`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-[10px] font-bold tracking-wider animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed mt-1 line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Bottom Right Arrow Button */}
              <div className="flex justify-end pt-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${item.arrowBg}`}
                >
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
