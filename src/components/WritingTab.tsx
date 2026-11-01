import React, { useState, useEffect, useRef } from 'react';
import { 
  PenTool, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  RotateCcw, 
  Download, 
  BookOpen, 
  Wand2, 
  Minimize2, 
  Maximize2, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  Share2, 
  History, 
  ArrowRight,
  Edit3,
  Feather,
  Sparkle
} from 'lucide-react';
import { AIWritingItem, WritingCategory } from '../types';
import { 
  playClickSound, 
  playSuccessSound, 
  playErrorSound, 
  synthesizeAndPlayVoice, 
  stopCurrentVoiceAudio 
} from '../utils/audio';

interface WritingTypeOption {
  id: WritingCategory;
  label: string;
  emoji: string;
  description: string;
  samplePrompt: string;
}

const WRITING_TYPES: WritingTypeOption[] = [
  { id: 'puisi', label: 'Puisi', emoji: '📜', description: 'Rima estetis, bait berirama, dan metafora puitis mendalam', samplePrompt: 'Tentang perjalanan waktu dan bintang yang redup' },
  { id: 'pantun', label: 'Pantun', emoji: '🎋', description: 'Pantun 4 baris sampiran & isi dengan rima a-b-a-b yang rapi', samplePrompt: 'Pantun nasihat tentang semangat belajar dan pantang menyerah' },
  { id: 'cerpen', label: 'Cerita Pendek', emoji: '📖', description: 'Narasi lengkap dengan penokohan, konflik, dan klimaks emosional', samplePrompt: 'Pertemuan dua sahabat lama di sebuah kedai kopi cyberpunk' },
  { id: 'novel', label: 'Novel / Cerbung', emoji: '📚', description: 'Bab pembuka atau kelanjutan cerita dengan world-building kuat', samplePrompt: 'Dunia di mana manusia bisa menukar ingatan mereka dengan uang' },
  { id: 'quotes', label: 'Quotes & Motivasi', emoji: '💎', description: 'Kata-kata mutiara, inspirasi hidup, dan kalimat bijak berbobot', samplePrompt: 'Motivasi bangkit dari kegagalan untuk menggapai mimpi' },
  { id: 'caption', label: 'Caption Medsos', emoji: '📱', description: 'Hook menarik, baris rapi, CTA, dan hashtag IG/TikTok/X', samplePrompt: 'Peluncuran produk kopi seduh dingin edisi terbatas' },
  { id: 'surat', label: 'Surat & Pesan', emoji: '✉️', description: 'Surat resmi, pesan permohonan, atau surat personal yang santun', samplePrompt: 'Surat ucapan terima kasih mendalam untuk seorang mentor' },
  { id: 'artikel', label: 'Artikel & Esai', emoji: '📰', description: 'Struktur judul, subjudul H2/H3, data, dan opini berbobot', samplePrompt: 'Dampak kecerdasan buatan terhadap masa depan industri kreatif' },
  { id: 'rangkuman', label: 'Rangkuman', emoji: '📑', description: 'Intisari ringkas, poin-poin utama, dan kesimpulan esensial', samplePrompt: 'Ringkasan konsep psikologi Stoikisme dalam kehidupan modern' },
  { id: 'terjemahan', label: 'Terjemahan', emoji: '🌐', description: 'Terjemahan natural dan kontekstual tanpa kaku per kata', samplePrompt: 'Terjemahkan ungkapan idiom Inggris ke Bahasa Indonesia alami' },
  { id: 'perbaiki', label: 'Perbaiki Tulisan', emoji: '✏️', description: 'Sempurnakan ejaan, tata bahasa EYD/PUEBI, dan susunan kalimat', samplePrompt: 'Perbaiki paragraf esai yang berantakan menjadi profesional' },
  { id: 'lanjutkan', label: 'Lanjutkan Tulisan', emoji: '⏩', description: 'Teruskan paragraf atau bab yang sedang ditulis secara mulus', samplePrompt: 'Lanjutkan kisah petualangan di gerbang benteng kuno' },
  { id: 'custom', label: 'Instruksi Bebas', emoji: '🎨', description: 'Tulis jenis karya apa saja sesuai panduan khusus Anda', samplePrompt: 'Naskah monolog drama teater 2 menit tentang kesendirian' },
];

const TONE_OPTIONS = [
  { id: 'santai', label: 'Santai & Akrab', emoji: '☕' },
  { id: 'formal', label: 'Formal & Profesional', emoji: '👔' },
  { id: 'puitis', label: 'Puitis & Estetis', emoji: '✨' },
  { id: 'lucu', label: 'Lucu & Humoris', emoji: '😄' },
  { id: 'dramatis', label: 'Dramatis & Sinematik', emoji: '🔥' },
  { id: 'sedih', label: 'Sedih & Melankolis', emoji: '🌧️' },
  { id: 'inspiratif', label: 'Inspiratif & Bijak', emoji: '🌟' },
  { id: 'filosofis', label: 'Filosofis & Mendalam', emoji: '🦉' },
  { id: 'romantis', label: 'Romantis & Lembut', emoji: '🌹' },
];

export const WritingTab: React.FC = () => {
  // Navigation between Studio and Saved Collection
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'history'>('editor');

  // Input states
  const [selectedType, setSelectedType] = useState<WritingCategory>('cerpen');
  const [titleOrIdea, setTitleOrIdea] = useState('');
  const [theme, setTheme] = useState('');
  const [genreOrPlot, setGenreOrPlot] = useState('');
  const [characters, setCharacters] = useState('');
  const [tone, setTone] = useState('santai');
  const [length, setLength] = useState<'singkat' | 'sedang' | 'panjang'>('sedang');
  const [instructions, setInstructions] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Indonesia');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Output and editor state
  const [content, setContent] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);

  // Audio speech playback for the writing
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Local storage history
  const [savedWritings, setSavedWritings] = useState<AIWritingItem[]>(() => {
    try {
      const stored = localStorage.getItem('nexera_ai_writings');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Save writings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nexera_ai_writings', JSON.stringify(savedWritings));
    } catch (e) {
      console.warn('Failed to save writings to localStorage:', e);
    }
  }, [savedWritings]);

  // Calculate statistics
  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = content.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 180));

  // Generate new writing
  const handleGenerate = async () => {
    if (!titleOrIdea.trim()) {
      setError('Harap masukkan judul atau ide tulisan Anda terlebih dahulu.');
      return;
    }

    playClickSound();
    setLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/writing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          titleOrIdea: titleOrIdea.trim(),
          theme: theme.trim() || undefined,
          genreOrPlot: genreOrPlot.trim() || undefined,
          characters: characters.trim() || undefined,
          tone,
          length,
          instructions: instructions.trim() || undefined,
          targetLanguage: selectedType === 'terjemahan' ? targetLanguage : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        let msg = data.error || 'Gagal menghasilkan tulisan.';
        if (res.status === 429) {
          msg = 'Batas kuota provider AI sedang penuh (429). Mohon tunggu beberapa detik lalu coba kembali.';
        }
        throw new Error(msg);
      }

      playSuccessSound();
      setContent(data.text);
      setCurrentTitle(data.title || titleOrIdea.trim());

      // Auto-save to collection
      const newItem: AIWritingItem = {
        id: 'write_' + Date.now(),
        title: data.title || titleOrIdea.trim(),
        type: selectedType,
        content: data.text,
        tone,
        wordCount: data.wordCount || data.text.split(/\s+/).filter(Boolean).length,
        theme: theme.trim() || undefined,
        createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      };

      setSavedWritings(prev => [newItem, ...prev.slice(0, 49)]);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      playErrorSound();
      setError(err.message || 'Terjadi gangguan jaringan saat menghubungi server AI. Silakan coba kembali.');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Transform existing writing (continue, fix, expand, shorten, restyle, regenerate)
  const handleTransform = async (action: 'continue' | 'fix' | 'expand' | 'shorten' | 'restyle' | 'regenerate', targetStyle?: string) => {
    if (!content.trim()) {
      setError('Editor masih kosong. Buat atau ketik tulisan terlebih dahulu sebelum diolah.');
      return;
    }

    playClickSound();
    setActionLoading(action);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/writing/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentText: content,
          action,
          targetStyle,
          customInstruction: instructions.trim() || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses perubahan tulisan.');
      }

      playSuccessSound();

      let nextContent = data.text;
      if (action === 'continue') {
        // If the continuation does not already include previous text, cleanly append
        if (!data.text.includes(content.slice(0, 80))) {
          nextContent = content.trim() + '\n\n' + data.text.trim();
        }
      }

      setContent(nextContent);

      // Update current title if restyled
      if (action === 'restyle' && targetStyle) {
        setCurrentTitle(prev => `${prev} (${targetStyle})`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      playErrorSound();
      setError(err.message || 'Gagal menjalankan aksi tersebut. Teks lama Anda tetap aman.');
    } finally {
      setActionLoading(null);
      setShowStyleModal(false);
      abortControllerRef.current = null;
    }
  };

  const copyToClipboard = () => {
    if (!content.trim()) return;
    playClickSound();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSave = () => {
    if (!content.trim()) return;
    playClickSound();
    const titleToUse = currentTitle || titleOrIdea || 'Karya Tulis NEXERA';

    const existingIndex = savedWritings.findIndex(w => w.title === titleToUse);
    const updatedItem: AIWritingItem = {
      id: existingIndex >= 0 ? savedWritings[existingIndex].id : 'write_' + Date.now(),
      title: titleToUse,
      type: selectedType,
      content,
      tone,
      wordCount,
      theme: theme.trim() || undefined,
      createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    if (existingIndex >= 0) {
      const copy = [...savedWritings];
      copy[existingIndex] = updatedItem;
      setSavedWritings(copy);
    } else {
      setSavedWritings(prev => [updatedItem, ...prev]);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDownload = () => {
    if (!content.trim()) return;
    playClickSound();
    const filename = `${(currentTitle || 'tulisan_nexera').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    playClickSound();
    if (!content.trim()) {
      setContent('');
      setCurrentTitle('');
      return;
    }
    if (window.confirm('Bersihkan isi editor tulisan ini? Pastikan Anda sudah menyalin atau menyimpannya jika masih diperlukan.')) {
      setContent('');
      setCurrentTitle('');
      stopCurrentVoiceAudio();
      setIsSpeaking(false);
    }
  };

  const handleLoadItem = (item: AIWritingItem) => {
    playClickSound();
    setContent(item.content);
    setCurrentTitle(item.title);
    setSelectedType(item.type);
    if (item.tone) setTone(item.tone);
    if (item.theme) setTheme(item.theme);
    setActiveSubTab('editor');
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    if (window.confirm('Hapus tulisan ini dari daftar koleksi?')) {
      setSavedWritings(prev => prev.filter(w => w.id !== id));
    }
  };

  const handleSpeak = async () => {
    if (!content.trim()) return;
    if (isSpeaking) {
      stopCurrentVoiceAudio();
      setIsSpeaking(false);
      return;
    }

    playClickSound();
    setIsSpeaking(true);

    await synthesizeAndPlayVoice(content, 'nexera', {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const selectedTypeObj = WRITING_TYPES.find(t => t.id === selectedType) || WRITING_TYPES[0];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0b132b]/95 via-[#0d1b3e]/90 to-[#120a2e]/90 border border-cyan-500/30 overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/40 flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                MODUL CANGGIH BARU • PUEBI / KBBI STANDARD
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                13+ Jenis Tulisan
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-orbitron font-extrabold text-white flex items-center gap-2.5 tracking-tight">
              <PenTool className="w-7 h-7 text-cyan-400" />
              <span>AI Writing Studio</span>
              <span className="text-xl">✍️</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Platform kreasi tulisan sastra, artikel, novel, puisi, dan copywriting terpadu. Masukkan ide singkat, AI mengembangkan karya utuh berbobot, dilengkapi alat pengolahan teks instan.
            </p>
          </div>

          {/* SubTab Toggle: Editor vs Koleksi */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 self-start md:self-auto">
            <button
              onClick={() => {
                playClickSound();
                setActiveSubTab('editor');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'editor'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Studio Tulis</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveSubTab('history');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'history'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Koleksi ({savedWritings.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio View */}
      {activeSubTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form & Configuration (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Pilih Jenis Tulisan */}
            <div className="p-5 rounded-3xl bg-[#050b1d]/90 border border-slate-800 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  1. Pilih Jenis Tulisan
                </label>
                <span className="text-[11px] font-mono text-cyan-400 font-bold">
                  {selectedTypeObj.emoji} {selectedTypeObj.label}
                </span>
              </div>

              {/* Grid of Writing Types */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {WRITING_TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedType(item.id);
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedType === item.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-900/70 border-slate-800/90 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{item.emoji}</span>
                      <span className="text-xs font-bold truncate">{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 italic bg-black/30 p-2.5 rounded-xl border border-slate-800/80">
                💡 <span className="font-semibold text-cyan-300">{selectedTypeObj.label}:</span> {selectedTypeObj.description}
              </p>
            </div>

            {/* 2. Judul / Ide Utama */}
            <div className="p-5 rounded-3xl bg-[#050b1d]/90 border border-slate-800 space-y-3 shadow-lg">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                2. Judul atau Ide Pokok <span className="text-red-400">*</span>
              </label>

              <textarea
                value={titleOrIdea}
                onChange={(e) => setTitleOrIdea(e.target.value)}
                placeholder={`Contoh: "${selectedTypeObj.samplePrompt}"...`}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all resize-none"
              />

              {/* Sample Prompt Quick Insertion Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] text-slate-500 flex-shrink-0">Contoh:</span>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setTitleOrIdea(selectedTypeObj.samplePrompt);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-cyan-950/50 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/40 flex-shrink-0 transition-all cursor-pointer"
                >
                  "{selectedTypeObj.samplePrompt}"
                </button>
              </div>
            </div>

            {/* 3. Pengaturan Gaya & Panjang Tulisan */}
            <div className="p-5 rounded-3xl bg-[#050b1d]/90 border border-slate-800 space-y-4 shadow-lg">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    3. Suasana & Nada Suara
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 capitalize">{tone}</span>
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setTone(t.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        tone === t.id
                          ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Panjang Tulisan */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between mb-2">
                  <span>Target Panjang Tulisan:</span>
                  <span className="text-[11px] font-mono text-cyan-400 capitalize">
                    {length === 'singkat' ? 'Singkat (150-300 kata)' : length === 'panjang' ? 'Panjang (800-1500 kata)' : 'Sedang (400-750 kata)'}
                  </span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {(['singkat', 'sedang', 'panjang'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setLength(l);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        length === l
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accordion: Opsi Tambahan / Latar & Karakter */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Opsi Tambahan (Tema, Alur, Karakter)</span>
                  </span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvanced && (
                  <div className="space-y-3 pt-3 animate-in fade-in duration-200">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Tema Spesifik (Opsional):</label>
                      <input
                        type="text"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        placeholder="Contoh: Cinta bertepuk sebelah tangan, teknologi masa depan..."
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {(selectedType === 'cerpen' || selectedType === 'novel') && (
                      <>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400">Tokoh / Karakter:</label>
                          <input
                            type="text"
                            value={characters}
                            onChange={(e) => setCharacters(e.target.value)}
                            placeholder="Contoh: Rian (programer pendiam), Maya (peneliti cerdas)..."
                            className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400">Alur Cerita / Plot Twist:</label>
                          <input
                            type="text"
                            value={genreOrPlot}
                            onChange={(e) => setGenreOrPlot(e.target.value)}
                            placeholder="Contoh: Menggunakan alur maju dengan kejutan di akhir cerita..."
                            className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </>
                    )}

                    {selectedType === 'terjemahan' && (
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">Bahasa Target:</label>
                        <input
                          type="text"
                          value={targetLanguage}
                          onChange={(e) => setTargetLanguage(e.target.value)}
                          placeholder="Contoh: Bahasa Indonesia Alami, Bahasa Inggris Gaul, dll."
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Instruksi Khusus Tambahan:</label>
                      <input
                        type="text"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Contoh: Gunakan rima kuat, sertakan dialog di paragraf kedua..."
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Submit Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || Boolean(actionLoading)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:via-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-orbitron font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Menenun Karya dengan AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Buat Tulisan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Editor & Transform Toolbar (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Error Banner if any */}
            {error && (
              <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 flex items-start justify-between gap-3 text-red-200 text-xs sm:text-sm animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-300">Pemberitahuan Sistem:</p>
                    <p className="mt-0.5 leading-relaxed">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-400 hover:text-white cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Transform Action Toolbar */}
            <div className="p-3.5 rounded-2xl bg-[#081026] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-2 shadow-lg">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-cyan-400 mr-1 hidden sm:inline">
                  Pengolahan Teks:
                </span>

                {/* Continue */}
                <button
                  type="button"
                  onClick={() => handleTransform('continue')}
                  disabled={!content.trim() || loading || Boolean(actionLoading)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Lanjutkan naskah dari bagian terakhir"
                >
                  {actionLoading === 'continue' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>Lanjutkan</span>
                </button>

                {/* Fix & Proofread */}
                <button
                  type="button"
                  onClick={() => handleTransform('fix')}
                  disabled={!content.trim() || loading || Boolean(actionLoading)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-950 border border-slate-700 hover:border-emerald-500/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Perbaiki tata bahasa, EYD & susunan kalimat"
                >
                  {actionLoading === 'fix' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>Perbaiki EYD</span>
                </button>

                {/* Expand / Panjangin */}
                <button
                  type="button"
                  onClick={() => handleTransform('expand')}
                  disabled={!content.trim() || loading || Boolean(actionLoading)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-950 border border-slate-700 hover:border-blue-500/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Perluas tulisan dengan detail relevan"
                >
                  {actionLoading === 'expand' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Maximize2 className="w-3.5 h-3.5 text-blue-400" />}
                  <span>Panjangin</span>
                </button>

                {/* Shorten / Persingkat */}
                <button
                  type="button"
                  onClick={() => handleTransform('shorten')}
                  disabled={!content.trim() || loading || Boolean(actionLoading)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-950 border border-slate-700 hover:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Buat versi ringkas tanpa kehilangan pesan utama"
                >
                  {actionLoading === 'shorten' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Minimize2 className="w-3.5 h-3.5 text-amber-400" />}
                  <span>Persingkat</span>
                </button>

                {/* Restyle / Ubah Gaya */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStyleModal(!showStyleModal)}
                    disabled={!content.trim() || loading || Boolean(actionLoading)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-950 border border-slate-700 hover:border-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Ubah tulisan menjadi gaya bahasa lain"
                  >
                    {actionLoading === 'restyle' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <Wand2 className="w-3.5 h-3.5 text-purple-400" />}
                    <span>Ubah Gaya</span>
                  </button>

                  {/* Restyle Popover Modal */}
                  {showStyleModal && (
                    <div className="absolute top-full left-0 mt-2 w-56 p-3 rounded-2xl bg-[#070d24] border border-purple-500/40 shadow-2xl z-30 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                      <p className="text-[10px] font-bold uppercase text-purple-300 tracking-wider px-1 pb-1 border-b border-slate-800">
                        Pilih Gaya Baru:
                      </p>
                      {TONE_OPTIONS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleTransform('restyle', item.label)}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-purple-950/60 text-xs text-slate-200 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Regenerate / Buat Ulang */}
                <button
                  type="button"
                  onClick={() => handleTransform('regenerate')}
                  disabled={!content.trim() || loading || Boolean(actionLoading)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-950 border border-slate-700 hover:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Buat versi alternatif baru yang berbeda"
                >
                  {actionLoading === 'regenerate' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />}
                  <span>Buat Ulang</span>
                </button>
              </div>

              {/* Utility actions: Speak, Copy, Save, Clear */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSpeak}
                  disabled={!content.trim()}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    isSpeaking 
                      ? 'bg-red-500/20 border-red-400 text-red-300 animate-pulse'
                      : 'bg-slate-900 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300'
                  }`}
                  title={isSpeaking ? 'Hentikan Suara' : 'Dengarkan dengan Suara AI'}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={copyToClipboard}
                  disabled={!content.trim()}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                  title="Salin Seluruh Teks"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleManualSave}
                  disabled={!content.trim()}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                  title="Simpan ke Koleksi"
                >
                  {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!content.trim()}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-blue-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                  title="Unduh File Naskah (.MD)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={!content.trim()}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                  title="Bersihkan Editor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Editor Canvas */}
            <div className="relative rounded-3xl bg-[#040817] border border-cyan-500/30 overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
              {/* Editor Top Bar Info */}
              <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    placeholder="Judul Karya Tulis..."
                    className="font-orbitron font-bold text-white text-sm bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-400 focus:outline-none transition-colors px-1"
                  />
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                    {selectedType.toUpperCase()}
                  </span>
                </div>

                {/* Statistics Bar */}
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span><strong>{wordCount}</strong> kata</span>
                  <span>•</span>
                  <span><strong>{charCount}</strong> karakter</span>
                  <span>•</span>
                  <span>~<strong>{readingTimeMin}</strong> mnt baca</span>
                </div>
              </div>

              {/* Textarea Area */}
              <div className="relative flex-1 p-5 sm:p-6 bg-gradient-to-b from-transparent to-[#020510]/60 flex flex-col">
                {loading && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse">
                      <Sparkles className="w-6 h-6 text-white animate-spin" />
                    </div>
                    <p className="font-orbitron font-bold text-sm text-cyan-300">
                      NEXERA AI sedang menyusun karya...
                    </p>
                    <p className="text-xs text-slate-400">
                      Menghubungkan struktur alur, diksi puitis, dan format PUEBI
                    </p>
                  </div>
                )}

                {actionLoading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                    <p className="text-xs font-bold text-white font-orbitron capitalize">
                      Sedang memproses aksi "{actionLoading}"...
                    </p>
                  </div>
                )}

                <textarea
                  ref={editorRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Karya tulis Anda akan muncul di sini. Anda juga bisa langsung mengetik, mengedit, atau menempel teks Anda di area editor ini..."
                  className="flex-1 w-full bg-transparent text-slate-100 placeholder-slate-600 text-sm sm:text-base leading-relaxed focus:outline-none resize-none font-sans scrollbar-thin"
                  style={{ minHeight: '400px' }}
                />
              </div>

              {/* Editor Bottom Status Bar */}
              <div className="px-5 py-2.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Editor Aktif • Bisa Diedit Manual Bebas</span>
                </div>
                <span>NEXERA AI Writing Engine v2.0</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Saved Collection View */
        <div className="p-6 rounded-3xl bg-[#050b1d]/90 border border-slate-800 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-orbitron font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <span>Koleksi Karya Tulisan Anda</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tulisan tersimpan di memori lokal peramban Anda. Klik untuk membuka kembali di editor.
              </p>
            </div>

            {savedWritings.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  if (window.confirm('Hapus seluruh koleksi tulisan yang tersimpan?')) {
                    setSavedWritings([]);
                  }
                }}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                Hapus Semua
              </button>
            )}
          </div>

          {savedWritings.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <FileText className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-slate-300">Belum ada karya tulis yang tersimpan</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Buat tulisan pertama Anda di tab Studio Tulis. Setiap karya yang dihasilkan akan otomatis terarsipkan di sini.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('editor')}
                className="mt-2 px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all cursor-pointer"
              >
                Mulai Tulis Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedWritings.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleLoadItem(item)}
                  className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-mono uppercase font-bold border border-cyan-500/30">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-slate-500">{item.createdAt}</span>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-slate-500">{item.wordCount} kata</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          navigator.clipboard.writeText(item.content);
                          alert('Tulisan berhasil disalin ke clipboard!');
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="Salin Teks"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300"
                        title="Hapus Tulisan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
