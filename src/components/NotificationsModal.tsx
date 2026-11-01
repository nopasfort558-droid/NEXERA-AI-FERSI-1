import React from 'react';
import { X, Bell, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 1,
      title: 'Animasi Video Gojo & Sasuke Aktif!',
      description: 'Fitur video looping bergerak Gojo Satoru (Six Eyes) dan Sasuke Uchiha (Sharingan) telah berhasil diintegrasikan pada Dashboard NEXERA AI.',
      time: 'Baru saja',
      icon: Sparkles,
      color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30',
      unread: true,
    },
    {
      id: 2,
      title: 'Upgrade Inti AI Gemini 3.8 & Vision AI',
      description: 'Layanan Chat AI, pembuatan gambar berkecepatan tinggi, dan Vision AI cerdas telah siap digunakan secara penuh.',
      time: '10 menit yang lalu',
      icon: Zap,
      color: 'text-purple-400 bg-purple-950/60 border-purple-500/30',
      unread: true,
    },
    {
      id: 3,
      title: 'Selamat Datang di NEXERA AI v2.5',
      description: 'Akun Anda telah diaktifkan dengan status VIP Pro Member. Nikmati akses tanpa batas ke semua fitur AI.',
      time: 'Kemarin',
      icon: CheckCircle2,
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
      unread: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => {
          playClickSound();
          onClose();
        }}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#070e24] border border-cyan-500/40 rounded-2xl p-5 shadow-[0_0_40px_rgba(6,182,212,0.3)] z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Notifikasi Sistem</h3>
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
              2 Baru
            </span>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="mt-3 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {notifications.map((notif) => {
            const Icon = notif.icon;
            return (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  notif.unread
                    ? 'bg-slate-900/90 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : 'bg-slate-900/40 border-slate-800/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 ${notif.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm font-bold text-white truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {notif.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {notif.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md cursor-pointer transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
