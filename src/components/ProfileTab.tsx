import React, { useState } from 'react';
import { User, Mail, Shield, Award, Edit3, Check, Sparkles, MessageSquare, Image as ImageIcon, Eye, Zap, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const ProfileTab: React.FC = () => {
  const { user, updateProfile, isLoggedIn, logout, setLoginModalOpen } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio);
  const [avatar, setAvatar] = useState(user.avatar);
  const [membershipTier, setMembershipTier] = useState(user.membershipTier);

  // Avatar presets
  const avatarPresets = [
    {
      name: 'NEXERA AI (Gojo & Sasuke)',
      url: '/app-icon.png',
    },
    {
      name: 'Gojo Satoru (Anime)',
      url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Sasuke Uchiha (Anime)',
      url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Cyberpunk Sorcerer',
      url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Neon Ninja',
      url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Futuristic AI Avatar',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccessSound();
    updateProfile({
      name: name.trim() || user.name,
      email: email.trim() || user.email,
      bio: bio.trim(),
      avatar,
      membershipTier,
    });
    setIsEditing(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Profile Card Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#091533] via-[#0e1136] to-[#1a0c30] border-2 border-purple-500/40 shadow-[0_0_35px_rgba(168,85,247,0.2)] backdrop-blur-xl overflow-hidden">
        {/* Glow corners */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar Frame with Glowing Ring */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-[3px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 shadow-[0_0_25px_rgba(168,85,247,0.5)]">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full rounded-[21px] object-cover bg-slate-900"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 border-2 border-slate-950 text-white text-[10px] font-bold shadow-md">
                Online
              </span>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/30 to-fuchsia-500/30 border border-purple-400/50 text-purple-300 text-xs font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                  {user.membershipTier}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-cyan-300 font-mono">
                {user.email}
              </p>

              <p className="text-xs text-slate-300 max-w-md leading-relaxed pt-1">
                {user.bio}
              </p>

              <div className="pt-2 flex items-center justify-center sm:justify-start gap-3 text-xs text-slate-400">
                <span>Terdaftar: <strong className="text-slate-200">{user.joinDate}</strong></span>
                <span>•</span>
                <span>Status: <strong className="text-emerald-400">Aktif & Terverifikasi</strong></span>
              </div>
            </div>
          </div>

          {/* Action Button: Edit or Login */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                playClickSound();
                setIsEditing(!isEditing);
              }}
              className="px-5 py-2.5 rounded-2xl bg-cyan-600/80 hover:bg-cyan-500 border border-cyan-400/50 text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isEditing ? 'Tutup Edit' : 'Edit Profil'}</span>
            </button>

            {isLoggedIn ? (
              <button
                onClick={() => {
                  playClickSound();
                  logout();
                }}
                className="px-5 py-2.5 rounded-2xl bg-red-950/60 hover:bg-red-900/70 border border-red-500/40 text-red-300 font-semibold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  playClickSound();
                  setLoginModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Akun</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Form if open */}
      {isEditing && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/40 shadow-xl space-y-4 animate-in fade-in slide-in-from-top duration-300">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-cyan-400" />
            <span>Perbarui Informasi Profil Anda</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Akun (Akan ditampilkan pada sapaan Dashboard):
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Akun:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bio / Status Pengguna:
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Pilih Avatar Anime / Karakter:
              </label>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {avatarPresets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setAvatar(p.url);
                    }}
                    className={`flex-shrink-0 w-14 h-14 rounded-2xl p-0.5 border-2 transition-all cursor-pointer ${
                      avatar === p.url
                        ? 'border-cyan-400 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                        : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={p.url}
                      alt={p.name}
                      className="w-full h-full rounded-[14px] object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Usage Statistics Grid */}
      <div>
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>Statistik Penggunaan NEXERA AI</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-400 mb-2">
              <span className="text-xs font-semibold">Total Obrolan</span>
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-white">{user.stats.chatsCount}</p>
            <span className="text-[10px] text-slate-400 mt-1">Pesan terproses</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-semibold">Gambar AI</span>
              <ImageIcon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-white">{user.stats.imagesCount}</p>
            <span className="text-[10px] text-slate-400 mt-1">Karya terbuat</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-cyan-400 mb-2">
              <span className="text-xs font-semibold">Scan Vision</span>
              <Eye className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-white">{user.stats.visionCount}</p>
            <span className="text-[10px] text-slate-400 mt-1">Analisis visual</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-xs font-semibold">Token Limit</span>
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-white">Tak Terbatas</p>
            <span className="text-[10px] text-emerald-400 font-semibold mt-1">VIP Pro Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
