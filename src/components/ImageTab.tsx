import React, { useState, useEffect } from 'react';
import { Sparkles, Download, Copy, Check, RefreshCw, ZoomIn, X, Wand2, Image as ImageIcon } from 'lucide-react';
import { GeneratedImageItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const ImageTab: React.FC = () => {
  const { incrementStats } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('anime');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageItem | null>(null);

  const [gallery, setGallery] = useState<GeneratedImageItem[]>(() => {
    try {
      const saved = localStorage.getItem('nexera_image_gallery');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'img_sample_1',
        url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
        originalPrompt: 'Gojo Satoru menggunakan teknik Hollow Purple di kota neon',
        enhancedPrompt: 'Masterpiece anime art of Gojo Satoru casting Hollow Purple, infinity cursed energy, vibrant cyan and purple neon lightning, ultra detailed',
        style: 'gojo',
        aspectRatio: '1:1',
        timestamp: 'Contoh Karya',
      },
      {
        id: 'img_sample_2',
        url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
        originalPrompt: 'Sasuke Uchiha dengan Susanoo api ungu dan mata Rinnegan',
        enhancedPrompt: 'Epic Sasuke Uchiha surrounded by ethereal purple Susanoo armor flames, dark cinematic lighting, glowing red sharingan and purple rinnegan',
        style: 'sasuke',
        aspectRatio: '1:1',
        timestamp: 'Contoh Karya',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexera_image_gallery', JSON.stringify(gallery));
    } catch (e) {}
  }, [gallery]);

  const styleOptions = [
    { id: 'anime', label: 'Anime Epic', desc: 'Mappa / Ufotable style' },
    { id: 'gojo', label: 'Gojo Aura', desc: 'Six Eyes & Blue Limitless' },
    { id: 'sasuke', label: 'Sasuke Flame', desc: 'Susanoo & Chidori' },
    { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Futuristic Sci-Fi' },
    { id: 'realistic', label: 'Photorealistic', desc: 'Cinematic 8K' },
  ];

  const aspectRatios = [
    { id: '1:1', label: '1:1 Persegi' },
    { id: '16:9', label: '16:9 Lanskap' },
    { id: '9:16', label: '9:16 Wallpaper' },
    { id: '4:3', label: '4:3 Standar' },
  ];

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = (customPrompt || prompt).trim();
    if (!textToUse || loading) return;

    playClickSound();
    setLoading(true);

    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToUse,
          style,
          aspectRatio,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || 'Gagal menghasilkan gambar AI.');
      }

      playSuccessSound();
      incrementStats('images');

      const newItem: GeneratedImageItem = {
        id: `img_${Date.now()}`,
        url: data.imageUrl,
        originalPrompt: data.originalPrompt || textToUse,
        enhancedPrompt: data.enhancedPrompt || textToUse,
        style,
        aspectRatio,
        timestamp: 'Baru saja',
      };

      setGallery((prev) => [newItem, ...prev]);
      setSelectedImage(newItem);
    } catch (err: any) {
      console.error(err);
      alert(`Gagal membuat gambar: ${err.message || 'Silakan coba lagi.'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = (text: string, id: string) => {
    playClickSound();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadImage = (url: string, filename: string) => {
    playClickSound();
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = filename || 'nexera-ai-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner Studio */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-[#0a122e] via-[#100d2b] to-[#0a1636] border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] backdrop-blur-xl">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-purple-950/70 border border-purple-500/40 text-purple-400">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              AI Image Generator
            </h2>
            <p className="text-xs text-slate-400">
              Ubah imajinasimu menjadi karya seni anime & cyberpunk berkualitas tinggi secara instan
            </p>
          </div>
        </div>

        {/* Prompt Input Form */}
        <div className="mt-4 space-y-4">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Deskripsikan gambar yang ingin dibuat... (contoh: Gojo Satoru mengaktifkan domain expansion Muryokusho dengan petir biru elektrik berputar)"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 text-sm transition-all resize-none"
            />
          </div>

          {/* Style Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Pilih Gaya Seni (Style Preset):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {styleOptions.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setStyle(st.id);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    style === st.id
                      ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">{st.label}</p>
                  <p className="text-[10px] text-slate-400">{st.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio & Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 mr-1">Rasio:</span>
              {aspectRatios.map((ar) => (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAspectRatio(ar.id);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    aspectRatio === ar.id
                      ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={loading || !prompt.trim()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Sedang Merender Gambar...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Buat Gambar AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Galeri Hasil Gambar</h3>
          </div>
          <span className="text-xs text-slate-400">{gallery.length} Gambar tersimpan</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {gallery.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg hover:border-purple-500/50 transition-all"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-slate-950">
                <img
                  src={item.url}
                  alt={item.originalPrompt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Hover Action Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3.5">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedImage(item)}
                      className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md cursor-pointer transition-all shadow-md"
                      title="Perbesar"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadImage(item.url, `nexera-${item.id}.jpg`)}
                      className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md cursor-pointer transition-all shadow-md"
                      title="Unduh"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-white line-clamp-2">
                      {item.originalPrompt}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-700/60 text-[10px] text-slate-400">
                      <span className="uppercase text-purple-300 font-bold">{item.style}</span>
                      <button
                        onClick={() => copyPrompt(item.originalPrompt, item.id)}
                        className="flex items-center gap-1 hover:text-cyan-300 transition-colors"
                      >
                        {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Salin Prompt</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setSelectedImage(null)}
          />

          <div className="relative max-w-3xl w-full bg-[#080d22] border border-purple-500/40 rounded-3xl p-5 shadow-[0_0_50px_rgba(168,85,247,0.4)] z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="font-bold text-white text-sm sm:text-base truncate max-w-md">
                {selectedImage.originalPrompt}
              </h4>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[60vh]">
              <img
                src={selectedImage.url}
                alt={selectedImage.originalPrompt}
                className="max-h-[60vh] w-auto object-contain rounded-2xl"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400">
                Gaya: <span className="text-purple-300 font-bold uppercase">{selectedImage.style}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyPrompt(selectedImage.enhancedPrompt, selectedImage.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === selectedImage.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin Prompt AI</span>
                </button>
                <button
                  onClick={() => downloadImage(selectedImage.url, `nexera-${selectedImage.id}.jpg`)}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Gambar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
