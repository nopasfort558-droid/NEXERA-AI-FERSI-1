import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  FileUp, 
  Send, 
  BookOpen, 
  ShieldCheck, 
  FileCheck,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { KnowledgeDocument } from '../types';
import { playClickSound, playSuccessSound, playErrorSound } from '../utils/audio';

interface DocMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: string[];
}

export const KnowledgeBaseTab: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<DocMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Halo ${user.name}! Unggah dokumen PDF, TXT, MD, atau JSON milikmu. Aku akan membaca dan menjawab pertanyaanmu secara akurat dan ketat berdasarkan isi dokumen tersebut tanpa mengarang informasi.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load documents scoped to current user
  useEffect(() => {
    try {
      const storageKey = `nexera_knowledge_docs_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: KnowledgeDocument[] = JSON.parse(saved);
        setDocuments(parsed);
        // By default, select all docs
        setSelectedDocIds(parsed.map(d => d.id));
      } else {
        // Seed initial sample knowledge note if empty
        const sampleDoc: KnowledgeDocument = {
          id: 'doc-seed-1',
          userId: user.id,
          name: 'Panduan_NEXERA_Core_Architecture.txt',
          size: '3.4 KB',
          type: 'text/plain',
          charCount: 1240,
          summary: 'Dokumen arsitektur sistem NEXERA AI yang menjelaskan modul Gojo Infinity Engine, Sasuke Lightning Core, sandboxing WA Bot, dan APK Builder.',
          text: `PANDUAN SISTEM NEXERA AI CORE ARCHITECTURE:
1. Modul Gojo Infinity: Memproses penalaran logika tanpa batas dan analisis multidimensi.
2. Modul Sasuke Lightning: Menangani eksekusi cepat, sandboxing WA Bot Baileys, dan kompilasi script bot.
3. Modul Vision AI: Menggunakan model Gemini multimodal untuk menganalisis gambar, OCR, dan deteksi objek.
4. Modul AI Knowledge Base: Melakukan grounding pencarian dokumen lokal secara ketat tanpa halusinasi.
5. Modul AI Memory: Menyimpan preferensi, bio, dan catatan penting pengguna secara privat.
Semua API key aman diisolasi pada server proxy backend.`,
          uploadedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        };
        setDocuments([sampleDoc]);
        setSelectedDocIds([sampleDoc.id]);
        localStorage.setItem(storageKey, JSON.stringify([sampleDoc]));
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  }, [user.id]);

  // Save documents to localStorage whenever changed
  const saveDocuments = (docs: KnowledgeDocument[]) => {
    setDocuments(docs);
    try {
      const storageKey = `nexera_knowledge_docs_${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(docs));
    } catch (e) {
      console.error('Failed to save docs:', e);
    }
  };

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadError(null);

    // Limit size to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 15MB.');
      playErrorSound();
      return;
    }

    setIsUploading(true);
    setUploadProgress(`Membaca file "${file.name}"...`);

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 part
          const base64 = result.split(',')[1] || result;
          resolve(base64);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      setUploadProgress('Mengekstrak teks & menganalisis dokumen dengan AI...');

      const formattedSize = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(1)} KB`;

      const response = await fetch('/api/documents/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: formattedSize,
          base64: base64Data
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses dokumen');
      }

      const newDoc: KnowledgeDocument = {
        id: data.document.id,
        userId: user.id,
        name: data.document.name,
        size: data.document.size,
        type: data.document.type,
        text: data.document.text,
        summary: data.document.summary,
        charCount: data.document.charCount,
        uploadedAt: data.document.uploadedAt
      };

      const updated = [newDoc, ...documents];
      saveDocuments(updated);
      setSelectedDocIds(prev => [...prev, newDoc.id]);

      playSuccessSound();
      setUploadProgress(null);

      // Add notice to chat
      setChatMessages(prev => [
        ...prev,
        {
          id: 'upload-' + Date.now(),
          sender: 'ai',
          text: `✅ Dokumen **"${newDoc.name}"** berhasil diindeks (${newDoc.charCount.toLocaleString()} karakter).\n\n**Ringkasan AI:**\n${newDoc.summary}\n\nSekarang kamu bisa bertanya apa saja mengenai isi dokumen ini!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

    } catch (err: any) {
      console.error('Upload failed:', err);
      playErrorSound();
      setUploadError(err.message || 'Terjadi kesalahan saat memproses dokumen.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete document
  const handleDeleteDoc = (docId: string, docName: string) => {
    playClickSound();
    if (!confirm(`Hapus dokumen "${docName}" dari Knowledge Base?`)) return;
    const updated = documents.filter(d => d.id !== docId);
    saveDocuments(updated);
    setSelectedDocIds(prev => prev.filter(id => id !== docId));
  };

  // Toggle selection
  const toggleSelectDoc = (id: string) => {
    playClickSound();
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter(item => item !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  // Select all / Deselect all
  const toggleSelectAll = () => {
    playClickSound();
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map(d => d.id));
    }
  };

  // Handle Q&A submit
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isQuerying) return;

    const query = inputQuery.trim();
    setInputQuery('');

    // Check if any doc is selected
    const activeDocs = documents.filter(d => selectedDocIds.includes(d.id));
    if (activeDocs.length === 0) {
      setChatMessages(prev => [
        ...prev,
        {
          id: 'user-' + Date.now(),
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: '⚠️ Tidak ada dokumen yang dipilih sebagai sumber referensi. Harap centang minimal satu dokumen di panel kiri/atas untuk memulai penelusuran.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }

    const userMsg: DocMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsQuerying(true);

    try {
      const response = await fetch('/api/documents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          documents: activeDocs.map(d => ({
            name: d.name,
            text: d.text.slice(0, 100000) // safety limit
          })),
          history: chatMessages.slice(-6).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            parts: [{ text: m.text }]
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memproses tanya jawab dokumen');
      }

      const aiMsg: DocMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: activeDocs.map(d => d.name)
      };

      setChatMessages(prev => [...prev, aiMsg]);
      playSuccessSound();

    } catch (err: any) {
      playErrorSound();
      setChatMessages(prev => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          sender: 'ai',
          text: `Terjadi kendala saat menganalisis dokumen: ${err.message || 'Error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#081026]/90 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              AI Knowledge Base
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-400/40">
              GROUNDED RAG
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Unggah PDF atau dokumen catatanmu. AI menjawab hanya berdasarkan isi dokumen nyata tanpa mengarang.
          </p>
        </div>

        {/* User Scope badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Privat: Dokumen milik <strong className="text-white">{user.name}</strong></span>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Document Manager (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Upload Area */}
          <div className="p-5 rounded-3xl bg-[#081026] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileUp className="w-4 h-4 text-cyan-400" />
                <span>Unggah Dokumen Baru</span>
              </h2>
              <span className="text-[11px] text-slate-400">PDF, TXT, MD, JSON, CSV</span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isUploading
                  ? 'border-purple-500 bg-purple-950/20'
                  : 'border-slate-700 hover:border-cyan-400/60 bg-slate-900/50 hover:bg-slate-900/90'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.json,.csv"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />

              {isUploading ? (
                <div className="space-y-2">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-cyan-300 animate-pulse">
                    {uploadProgress || 'Memproses dokumen...'}
                  </p>
                  <p className="text-[10px] text-slate-400">Harap tunggu beberapa detik</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Ketuk untuk Memilih File atau Drag & Drop
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Maksimal ukuran file: 15MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Stored Document List */}
          <div className="p-5 rounded-3xl bg-[#081026] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white">
                  Koleksi Dokumen ({documents.length})
                </h2>
              </div>

              {documents.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium"
                >
                  {selectedDocIds.length === documents.length ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Centang dokumen yang ingin dijadikan sumber rujukan jawaban AI saat bertanya.
            </p>

            {documents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Belum ada dokumen tersimpan. Silakan unggah dokumen pertamamu.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                {documents.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isChecked
                          ? 'bg-purple-950/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox & File info */}
                        <div 
                          onClick={() => toggleSelectDoc(doc.id)}
                          className="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="mt-0.5">
                            {isChecked ? (
                              <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate hover:text-purple-300 transition-colors">
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                              <span>{doc.size}</span>
                              <span>•</span>
                              <span>{doc.charCount.toLocaleString()} karakter</span>
                              <span>•</span>
                              <span>{doc.uploadedAt}</span>
                            </div>
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteDoc(doc.id, doc.name)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all cursor-pointer"
                          title="Hapus Dokumen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Summary preview */}
                      {doc.summary && (
                        <p className="mt-2 text-[11px] text-slate-400 bg-black/40 p-2 rounded-xl border border-slate-800/80 line-clamp-2">
                          <span className="text-purple-300 font-semibold">Inti: </span>
                          {doc.summary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Grounded Q&A Interface (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[650px] p-5 rounded-3xl bg-[#081026] border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          {/* Header of Chat */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">
                Tanya Jawab Dokumen Terverifikasi
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-medium">
                {selectedDocIds.length} Dokumen Aktif
              </span>
              <button
                onClick={() => {
                  playClickSound();
                  setChatMessages([]);
                }}
                className="text-[11px] text-slate-400 hover:text-red-400 cursor-pointer"
              >
                Reset Chat
              </button>
            </div>
          </div>

          {/* Strict Grounding Notice */}
          <div className="mt-2 p-2.5 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex items-center gap-2 text-[11px] text-blue-300">
            <FileCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span>
              <strong>Mode Anti-Halusinasi:</strong> AI hanya akan memberikan jawaban bila bukti tertulis ada di dalam dokumen.
            </span>
          </div>

          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto space-y-3.5 my-3 pr-2 scrollbar-thin">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-[10px] font-bold text-purple-300">
                      {msg.sender === 'user' ? user.name : 'NEXERA Knowledge AI'}
                    </span>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>

                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {/* Sources citation tag if assistant reply */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">Sumber Referensi:</span>
                      {msg.sources.map((s, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/30"
                        >
                          📄 {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isQuerying && (
              <div className="flex items-start">
                <div className="p-3 rounded-2xl bg-slate-900 text-cyan-300 text-xs border border-cyan-500/30 flex items-center gap-2 animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Membaca dan mencari jawaban dalam dokumen terpilih...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Form */}
          <form onSubmit={handleQuerySubmit} className="pt-2 flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Tanyakan apa saja tentang isi dokumen yang diunggah..."
              disabled={isQuerying}
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isQuerying}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
