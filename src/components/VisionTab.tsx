import React, { useState, useRef } from 'react';
import { Eye, Upload, Image as ImageIcon, Sparkles, RefreshCw, Copy, Check, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const VisionTab: React.FC = () => {
  const { incrementStats } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [prompt, setPrompt] = useState('Analisis gambar ini secara mendalam dan berikan informasi detail tentang isi, karakter/objek, warna, dan konteksnya.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample images for 1-click demo
  const sampleImages = [
    {
      title: 'Anime Gojo Six Eyes',
      url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      prompt: 'Jelaskan karakter dalam gambar ini, ciri khas visualnya, dan nuansa animenya.',
    },
    {
      title: 'Dokumen & Teks (OCR)',
      url: 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=600&auto=format&fit=crop&q=80',
      prompt: 'Ekstrak semua teks yang terbaca dalam gambar ini (OCR) dan jelaskan maknanya.',
    },
    {
      title: 'Pemandangan Cyberpunk',
      url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
      prompt: 'Analisis komposisi pencahayaan, objek teknologi, dan atmosfer futuristik dalam gambar ini.',
    },
  ];

  // Helper to downscale and optimize images client-side before sending to server
  const compressImageFile = (fileOrBlob: File | Blob): Promise<{ dataUrl: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(fileOrBlob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1100;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedData = canvas.toDataURL('image/jpeg', 0.85);
          resolve({ dataUrl: compressedData, mimeType: 'image/jpeg' });
        } else {
          // Fallback to direct FileReader
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ dataUrl: reader.result as string, mimeType: fileOrBlob.type || 'image/jpeg' });
          };
          reader.readAsDataURL(fileOrBlob);
        }
      };
      img.onerror = () => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ dataUrl: reader.result as string, mimeType: fileOrBlob.type || 'image/jpeg' });
        };
        reader.readAsDataURL(fileOrBlob);
      };
      img.src = url;
    });
  };

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Harap unggah file gambar (JPG, PNG, WEBP).');
      return;
    }

    try {
      const { dataUrl, mimeType: newMime } = await compressImageFile(file);
      setMimeType(newMime);
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
      setResult(null);
    } catch (e) {
      console.warn('Error compressing image:', e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const loadSample = async (sample: typeof sampleImages[0]) => {
    playClickSound();
    setLoading(true);
    setPrompt(sample.prompt);
    try {
      // Fetch sample and compress to base64
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const { dataUrl, mimeType: sampleMime } = await compressImageFile(blob);

      setMimeType(sampleMime);
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
      setResult(null);
    } catch (e) {
      console.warn('Failed to load sample:', e);
      setImagePreview(sample.url);
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async () => {
    if (!imageBase64 || loading) return;

    playClickSound();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          prompt,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.analysis) {
        throw new Error(data.error || 'Gagal menganalisis gambar.');
      }

      playSuccessSound();
      incrementStats('vision');
      setResult(data.analysis);
      setModelUsed(data.modelUsed);
    } catch (err: any) {
      console.error(err);
      setResult(`⚠️ ${err.message || 'Terjadi kendala saat menganalisis gambar. Silakan coba kembali.'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (!result) return;
    playClickSound();
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-[#051326] via-[#081e3a] to-[#0d1633] border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.18)] backdrop-blur-xl">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Vision AI Scanner
            </h2>
            <p className="text-xs text-slate-400">
              Analisis cerdas multimodal: baca teks (OCR), identifikasi karakter anime, deteksi objek, dan jawab pertanyaan dari gambar
            </p>
          </div>
        </div>

        {/* Preset Sample Quick Chips */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold">Coba Sampel Cepat:</span>
          {sampleImages.map((s, i) => (
            <button
              key={i}
              onClick={() => loadSample(s)}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 text-xs transition-all cursor-pointer"
            >
              ✦ {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload and Preview Box */}
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed p-6 flex flex-col items-center justify-center min-h-[300px] cursor-pointer transition-all overflow-hidden bg-slate-900/60 ${
              dragActive
                ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
                : 'border-slate-700/80 hover:border-cyan-500/50 hover:bg-slate-900/90'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {imagePreview ? (
              <div className="relative w-full h-full flex flex-col items-center">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-[280px] w-auto object-contain rounded-2xl shadow-md"
                />
                <p className="text-[11px] text-cyan-400 font-semibold mt-3">
                  Klik atau seret file lain untuk mengganti gambar
                </p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Unggah Gambar untuk Dianalisis</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tarik dan lepaskan file di sini, atau klik untuk memilih
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Mendukung JPG, PNG, WebP
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick analysis instruction chips */}
          <div className="flex flex-wrap gap-2">
            {[
              'Analisis Objek & Karakter',
              'Ekstrak Teks (OCR)',
              'Jelaskan Suasana & Warna',
              'Pecahkan Masalah dalam Gambar',
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  playClickSound();
                  setPrompt(
                    chip === 'Ekstrak Teks (OCR)'
                      ? 'Ekstrak seluruh teks dalam gambar ini secara presisi dan jelaskan maksud teks tersebut.'
                      : chip === 'Pecahkan Masalah dalam Gambar'
                      ? 'Selesaikan soal atau pertanyaan yang terlihat pada gambar ini dengan penjelasan langkah demi langkah.'
                      : `Lakukan ${chip.toLowerCase()} secara komprehensif.`
                  );
                }}
                className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 text-xs transition-all cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Prompt input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Instruksi / Pertanyaan Analisis:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs sm:text-sm resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={analyzeImage}
            disabled={!imageBase64 || loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menganalisis Visual dengan Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Mulai Analisis Vision AI</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Results Box */}
        <div className="rounded-3xl p-6 bg-slate-900/70 border border-cyan-500/30 flex flex-col justify-between shadow-[0_0_25px_rgba(6,182,212,0.1)] min-h-[350px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Hasil Analisis Vision</h3>
              </div>
              {modelUsed && (
                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-500/30">
                  {modelUsed}
                </span>
              )}
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                  <p className="text-sm font-semibold text-cyan-300">
                    Memindai layer gambar & mengekstrak informasi...
                  </p>
                  <p className="text-xs text-slate-500">
                    Ditenagai oleh Gemini Multimodal Vision AI
                  </p>
                </div>
              ) : result ? (
                <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[380px] overflow-y-auto pr-1">
                  {result}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <Eye className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs">
                    Unggah gambar di sebelah kiri dan klik &quot;Mulai Analisis Vision AI&quot;
                  </p>
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Analisis Selesai
              </span>

              <button
                onClick={copyResult}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin Hasil'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
