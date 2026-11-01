import React from 'react';
import { Menu, Bell, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { playClickSound } from '../utils/audio';

interface HeaderProps {
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
  onGoToProfile: () => void;
  onOpenAndroidCenter?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMenu,
  onOpenNotifications,
  onGoToProfile,
  onOpenAndroidCenter,
}) => {
  const { user, isLoggedIn, setLoginModalOpen } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#030712]/85 backdrop-blur-md border-b border-cyan-900/20 px-3 sm:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Menu + NEXERA AI Branding */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <button
            onClick={() => {
              playClickSound();
              onOpenMenu();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo Icon & Title */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[1.5px] shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <div className="w-full h-full bg-[#070d1e] rounded-[10px] flex items-center justify-center">
                <span className="font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 via-blue-300 to-indigo-300 text-lg sm:text-xl tracking-tighter">
                  N
                </span>
              </div>
              <div className="absolute -inset-0.5 rounded-xl bg-cyan-400/20 blur-sm pointer-events-none animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-orbitron font-extrabold tracking-wider text-white text-base sm:text-lg">
                  NEXERA
                </span>
                <span className="font-orbitron font-extrabold italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500 text-base sm:text-lg">
                  AI
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 tracking-wide block mt-0.5">
                AI Assistant
              </span>
            </div>
          </div>
        </div>

        {/* Right: AI Online Status, Notification, and User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* AI Online Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] sm:text-xs font-semibold shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden xs:inline">AI Online</span>
          </div>

          {/* Android APK & Publish Button */}
          {onOpenAndroidCenter && (
            <button
              onClick={() => {
                playClickSound();
                onOpenAndroidCenter();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-950/60 to-purple-950/60 border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow-sm active:scale-95 text-xs font-bold"
              title="Pusat APK Android & Link Publik"
            >
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">APK Android</span>
            </button>
          )}

          {/* Notification Button */}
          <button
            onClick={() => {
              playClickSound();
              onOpenNotifications();
            }}
            className="relative p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse">
              2
            </span>
          </button>

          {/* User Avatar */}
          <button
            onClick={() => {
              playClickSound();
              if (isLoggedIn) {
                onGoToProfile();
              } else {
                setLoginModalOpen(true);
              }
            }}
            className="relative group p-0.5 rounded-full transition-all active:scale-95 cursor-pointer"
            aria-label="Profil Pengguna"
            title={isLoggedIn ? `Login sebagai: ${user.name}` : 'Klik untuk Login'}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-indigo-500 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-all">
              <img
                src={
                  user.avatar ||
                  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80'
                }
                alt={user.name}
                className="w-full h-full rounded-full object-cover bg-slate-900"
                onError={(e) => {
                  // Fallback avatar
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                }}
              />
            </div>
            {isLoggedIn && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-cyan-400 border-2 border-slate-950 rounded-full" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
