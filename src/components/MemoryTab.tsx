import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  ShieldCheck, 
  Lock, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  User,
  Heart,
  Briefcase,
  Zap
} from 'lucide-react';
import { AIMemoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const MemoryTab: React.FC = () => {
  const { user } = useAuth();
  const storageKey = `nexera_memory_${user.id}`;

  const defaultState: { enabled: boolean; items: AIMemoryItem[] } = {
    enabled: true,
    items: [
      {
        id: 'mem_1',
        userId: user.id,
        category: 'profile',
        fact: 'Nama panggilan akun adalah ' + user.name + ' dan status akun adalah VIP Pro Member.',
        enabled: true,
        createdAt: 'Bawaan Akun',
      },
      {
        id: 'mem_2',
        userId: user.id,
        category: 'preference',
        fact: 'Penggemar anime Jujutsu Kaisen (Gojo Satoru) dan Naruto (Sasuke Uchiha).',
        enabled: true,
        createdAt: 'Preferensi Terdeteksi',
      },
      {
        id: 'mem_3',
        userId: user.id,
        category: 'project',
        fact: 'Sedang mengembangkan ekosistem aplikasi cerdas NEXERA AI (Chat, Image, Vision, WA Bot, App Builder).',
        enabled: true,
        createdAt: 'Konteks Sesi',
      },
    ],
  };

  const [memoryState, setMemoryState] = useState<{ enabled: boolean; items: AIMemoryItem[] }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultState;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(memoryState));
    } catch (e) {}
  }, [memoryState, storageKey]);

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AIMemoryItem | null>(null);
  const [factInput, setFactInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<AIMemoryItem['category']>('preference');

  const toggleMasterMemory = () => {
    playClickSound();
    setMemoryState((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const toggleItemEnabled = (id: string) => {
    playClickSound();
    setMemoryState((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it)),
    }));
  };

  const openAddModal = () => {
    playClickSound();
    setEditingItem(null);
    setFactInput('');
    setCategoryInput('preference');
    setModalOpen(true);
  };

  const openEditModal = (item: AIMemoryItem) => {
    playClickSound();
    setEditingItem(item);
    setFactInput(item.fact);
    setCategoryInput(item.category);
    setModalOpen(true);
  };

  const handleSaveMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!factInput.trim()) return;

    playSuccessSound();

    if (editingItem) {
      setMemoryState((prev) => ({
        ...prev,
        items: prev.items.map((it) =>
          it.id === editingItem.id
            ? { ...it, fact: factInput.trim(), category: categoryInput }
            : it
        ),
      }));
    } else {
      const newItem: AIMemoryItem = {
        id: `mem_${Date.now()}`,
        userId: user.id,
        category: categoryInput,
        fact: factInput.trim(),
        enabled: true,
        createdAt: 'Ditambahkan Manual',
      };
      setMemoryState((prev) => ({
        ...prev,
        items: [newItem, ...prev.items],
      }));
    }

    setModalOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    playClickSound();
    setMemoryState((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  };

  const handleClearAll = () => {
    playClickSound();
    if (window.confirm('Hapus seluruh catatan memori AI Anda?')) {
      setMemoryState((prev) => ({
        ...prev,
        items: [],
      }));
    }
  };

  const getCategoryBadge = (cat: AIMemoryItem['category']) => {
    switch (cat) {
      case 'profile':
        return { label: 'Profil Pengguna', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: User };
      case 'preference':
        return { label: 'Preferensi & Minat', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Heart };
      case 'project':
        return { label: 'Tugas & Proyek', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Briefcase };
      default:
        return { label: 'Fakta Umum', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', icon: Zap };
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-[#180a32] via-[#0b1638] to-[#06182e] border border-purple-500/40 shadow-[0_0_35px_rgba(168,85,247,0.18)] backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-950/80 border border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  AI Memory & Konteks Personal
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  memoryState.enabled 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {memoryState.enabled ? '● Memori Aktif' : '○ Memori Nonaktif'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                AI mengingat preferensi, gaya, dan konteks percakapan Anda agar setiap respon terasa lebih personal dan akurat.
              </p>
            </div>
          </div>

          {/* Master Switch Button */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={toggleMasterMemory}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border ${
                memoryState.enabled
                  ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {memoryState.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
              <span>{memoryState.enabled ? 'Memori Menyala' : 'Memori Dimatikan'}</span>
            </button>

            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Memori</span>
            </button>
          </div>
        </div>

        {/* Privacy Notice Card */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <span>Perlindungan Privasi & Izin Pengguna</span>
              <span className="text-[10px] text-emerald-400 font-normal">(Tersimpan di Akun Anda)</span>
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Memori hanya digunakan untuk mempersonalisasi respon percakapan Anda di NEXERA AI.
              Sistem tidak akan pernah menyimpan data sensitif seperti password, pin, nomor identitas, atau data perbankan. Anda memiliki kontrol penuh untuk mengubah atau menghapus data ini kapan saja.
            </p>
          </div>
        </div>
      </div>

      {/* Main Memory List */}
      <div className="rounded-3xl bg-[#060c22]/90 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-base">Daftar Fakta yang Diingat AI</h3>
            <p className="text-xs text-slate-400">
              Total {memoryState.items.length} memori tersimpan • {memoryState.items.filter((i) => i.enabled).length} aktif digunakan
            </p>
          </div>

          {memoryState.items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-500/40 text-xs transition-all cursor-pointer"
            >
              Hapus Semua
            </button>
          )}
        </div>

        {memoryState.items.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Brain className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold">Belum Ada Memori Tersimpan</p>
            <p className="text-xs max-w-sm mx-auto">
              Klik tombol &quot;Tambah Memori&quot; di atas untuk menambahkan hal penting tentang diri Anda yang ingin selalu diingat oleh AI.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {memoryState.items.map((item) => {
              const badge = getCategoryBadge(item.category);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    item.enabled && memoryState.enabled
                      ? 'bg-slate-900/80 border-slate-800 hover:border-purple-500/40 shadow-sm'
                      : 'bg-slate-950/60 border-slate-900 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${badge.color}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>

                      <button
                        onClick={() => toggleItemEnabled(item.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                          item.enabled ? 'text-emerald-400 bg-emerald-950/80' : 'text-slate-500 bg-slate-900'
                        }`}
                        title="Aktifkan / Nonaktifkan memori ini"
                      >
                        {item.enabled ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                      &ldquo;{item.fact}&rdquo;
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{item.createdAt}</span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="Edit Memori"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 hover:text-red-400 transition-colors cursor-pointer"
                        title="Hapus Memori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#070e24] border border-purple-500/40 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <span>{editingItem ? 'Edit Memori AI' : 'Tambah Memori AI Baru'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Kategori Memori:</label>
                <select
                  value={categoryInput}
                  onChange={(e: any) => setCategoryInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="profile">Profil Pengguna</option>
                  <option value="preference">Preferensi & Minat</option>
                  <option value="project">Proyek & Kebutuhan Khusus</option>
                  <option value="fact">Fakta Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Fakta / Informasi yang Perlu Diingat AI:
                </label>
                <textarea
                  value={factInput}
                  onChange={(e) => setFactInput(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Saya adalah developer React dan ingin jawaban yang selalu menyertakan kode TypeScript..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-purple-400 resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                🔒 Informasi ini akan otomatis disertakan sebagai konteks terverifikasi saat Anda menggunakan fitur Chat AI, AI Voice, dan AI Agent.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 text-white font-bold cursor-pointer shadow-md"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
