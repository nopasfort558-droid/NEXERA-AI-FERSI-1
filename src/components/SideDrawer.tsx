import React from 'react';
import { 
  X, 
  Sparkles, 
  User, 
  MessageSquare, 
  Image, 
  Eye, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  Bot, 
  Smartphone,
  Users,
  Brain,
  Mic,
  BookOpen,
  PenTool
} from 'lucide-react';
import { TabType } from '../types';
import { useAuth } from '../context/AuthContext';
import { playClickSound } from '../utils/audio';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
  onOpenAndroidCenter?: () => void;
  onReplayIntro?: () => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenAndroidCenter,
  onReplayIntro,
}) => {
  const { user, isLoggedIn, logout, setLoginModalOpen } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => {
          playClickSound();
          onClose();
        }}
      />

      {/* Drawer Panel */}
      <div className="relative w-80 max-w-[85vw] h-full bg-[#050b1d] border-r border-cyan-500/30 p-5 flex flex-col justify-between z-10 shadow-[0_0_50px_rgba(6,182,212,0.25)] animate-in slide-in-from-left duration-300 overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center font-orbitron font-black text-white text-base shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                N
              </div>
              <span className="font-orbitron font-extrabold text-white text-base tracking-wider">
                NEXERA AI
              </span>
            </div>
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User mini profile */}
          <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border border-cyan-500/40"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-cyan-400 truncate">{user.membershipTier}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-5 space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500 px-3 pb-1 tracking-wider">
              Navigasi Utama
            </p>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('dashboard');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-cyan-950/40 border border-transparent hover:border-cyan-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Dashboard Arena</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('chat');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-blue-950/40 border border-transparent hover:border-blue-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>Chat AI (Gojo & Sasuke)</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('image');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-purple-950/40 border border-transparent hover:border-purple-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <Image className="w-4 h-4 text-purple-400" />
              <span>AI Image Generator</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('vision');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-teal-950/40 border border-transparent hover:border-teal-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <Eye className="w-4 h-4 text-teal-400" />
              <span>Vision AI Scanner</span>
            </button>

            <p className="text-[10px] uppercase font-bold text-slate-500 px-3 pt-3 pb-1 tracking-wider">
              Modul Canggih Baru
            </p>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('agents');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-violet-950/40 border border-transparent hover:border-violet-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <Users className="w-4 h-4 text-violet-400" />
              <div className="flex items-center justify-between flex-1">
                <span>AI Agent Builder</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-bold">BARU</span>
              </div>
            </button>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('memory');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-pink-950/40 border border-transparent hover:border-pink-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <Brain className="w-4 h-4 text-pink-400" />
              <div className="flex items-center justify-between flex-1">
                <span>AI Memory Vault</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-bold">BARU</span>
              </div>
            </button>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('voice');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <Mic className="w-4 h-4 text-rose-400" />
              <div className="flex items-center justify-between flex-1">
                <span>AI Voice Assistant</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">BARU</span>
              </div>
            </button>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('knowledge');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-teal-950/40 border border-transparent hover:border-teal-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-teal-400" />
              <div className="flex items-center justify-between flex-1">
                <span>AI Knowledge Base</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold">BARU</span>
              </div>
            </button>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('writing');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-amber-950/40 border border-transparent hover:border-amber-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <PenTool className="w-4 h-4 text-amber-400" />
              <div className="flex items-center justify-between flex-1">
                <span>AI Writing Studio</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">BARU</span>
              </div>
            </button>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('wabot');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-emerald-950/40 border border-transparent hover:border-emerald-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>WA Bot Builder</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('appbuilder');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-indigo-950/40 border border-transparent hover:border-indigo-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>AI App / APK Maker</span>
            </button>

            {onOpenAndroidCenter && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenAndroidCenter();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-cyan-300 hover:text-white bg-cyan-950/30 hover:bg-cyan-950/60 border border-cyan-500/40 hover:border-cyan-400 transition-all text-xs font-bold cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <div className="flex items-center justify-between flex-1">
                  <span>Pusat APK Android</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">APK READY</span>
                </div>
              </button>
            )}

            {onReplayIntro && (
              <button
                onClick={() => {
                  playClickSound();
                  onReplayIntro();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-purple-300 hover:text-white bg-purple-950/20 hover:bg-purple-950/50 border border-purple-500/30 transition-all text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Putar Video Pembuka</span>
              </button>
            )}

            <button
              onClick={() => {
                playClickSound();
                onSelectTab('profil');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-fuchsia-950/40 border border-transparent hover:border-fuchsia-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <User className="w-4 h-4 text-fuchsia-400" />
              <span>Profil & Akun</span>
            </button>
          </div>
        </div>

        {/* Footer info & Login/Logout */}
        <div className="pt-4 border-t border-slate-800 space-y-3 mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gemini 3 + Custom Core</span>
            </span>
            <span className="font-mono text-[10px] text-cyan-400">v3.0.0</span>
          </div>

          {isLoggedIn ? (
            <button
              onClick={() => {
                playClickSound();
                logout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-900/50 text-xs font-semibold cursor-pointer transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Akun</span>
            </button>
          ) : (
            <button
              onClick={() => {
                playClickSound();
                onClose();
                setLoginModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-600/40 border border-cyan-500/50 text-cyan-200 hover:bg-cyan-600/60 text-xs font-semibold cursor-pointer transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk / Login Akun</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
