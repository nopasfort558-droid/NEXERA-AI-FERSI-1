import React, { useState } from 'react';
import { X, LogIn, UserCheck, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const LoginModal: React.FC = () => {
  const { loginModalOpen, setLoginModalOpen, login, user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [presetUser, setPresetUser] = useState<'custom' | 'nanzz' | 'gojo' | 'sasuke'>('custom');

  if (!loginModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    playSuccessSound();
    login(email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@nexera.ai`, name.trim());
    setLoginModalOpen(false);
  };

  const handleSelectPreset = (preset: 'nanzz' | 'gojo' | 'sasuke') => {
    playClickSound();
    setPresetUser(preset);
    if (preset === 'nanzz') {
      setName('Stock Nanzz');
      setEmail('stocknanzz@nexera.ai');
    } else if (preset === 'gojo') {
      setName('Gojo Satoru');
      setEmail('gojo.satoru@jujutsu.high');
    } else if (preset === 'sasuke') {
      setName('Sasuke Uchiha');
      setEmail('sasuke.uchiha@konoha.ninja');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
        onClick={() => {
          playClickSound();
          setLoginModalOpen(false);
        }}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#09122c] to-[#040816] border-2 border-cyan-500/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.35)] z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-white text-base sm:text-lg">
                Masuk ke NEXERA AI
              </h3>
              <p className="text-xs text-slate-400">
                Aktifkan akun & personalisasi ucapan selamat datang
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              setLoginModalOpen(false);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Profile Selectors */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-300 mb-2">Pilih Profil Cepat:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectPreset('nanzz')}
              className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                name === 'Stock Nanzz'
                  ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span>⚡ Stock Nanzz</span>
              <span className="text-[10px] text-slate-400 font-normal">Default Akun</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('gojo')}
              className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                name === 'Gojo Satoru'
                  ? 'bg-blue-950/70 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span>👁️ Gojo Satoru</span>
              <span className="text-[10px] text-slate-400 font-normal">Limitless</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('sasuke')}
              className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                name === 'Sasuke Uchiha'
                  ? 'bg-purple-950/70 border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span>🔥 Sasuke Uchiha</span>
              <span className="text-[10px] text-slate-400 font-normal">Rinnegan</span>
            </button>
          </div>
        </div>

        {/* Custom Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nama Lengkap / Panggilan Akun:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Stock Nanzz"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition-all"
            />
            <p className="text-[11px] text-cyan-400/80 mt-1">
              * Ucapan di Dashboard akan otomatis berubah menjadi: &quot;Halo, {name || '...'} 👋&quot;
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Alamat Email (Opsional):
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: user@nexera.ai"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition-all"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Simpan & Masuk Akun</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
