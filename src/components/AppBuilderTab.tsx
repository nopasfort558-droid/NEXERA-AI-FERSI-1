import React, { useState, useRef, useEffect } from 'react';
import { 
  Smartphone, 
  Code2, 
  Play, 
  Download, 
  Sparkles, 
  Wrench, 
  RefreshCw, 
  FileCode, 
  Monitor, 
  Tablet, 
  RotateCcw, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertCircle, 
  Info,
  CheckCircle2,
  Terminal,
  FolderGit2
} from 'lucide-react';
import JSZip from 'jszip';
import { AppProject } from '../types';
import { useAuth } from '../context/AuthContext';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const AppBuilderTab: React.FC = () => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('Aplikasi Catatan & Manajemen Tugas Harian Futuristik dengan pelacak prioritas, filter kategori, dan animasi neon');
  const [appCategory, setAppCategory] = useState('productivity');
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixIssue, setFixIssue] = useState('');
  const [showFixModal, setShowFixModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // View state: 'preview' or 'editor' or 'android'
  const [activeMainView, setActiveMainView] = useState<'preview' | 'editor' | 'android'>('preview');
  const [deviceFrame, setDeviceFrame] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [previewKey, setPreviewKey] = useState(0);

  // Project state
  const [project, setProject] = useState<AppProject>(() => {
    const defaultHtml = `<!DOCTYPE html>
<html lang="id" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Cyber Task - NEXERA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #030712; color: #f1f5f9; }
    .font-orbitron { font-family: 'Orbitron', sans-serif; }
    .glass { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(56, 189, 248, 0.2); }
  </style>
</head>
<body class="min-h-screen flex flex-col p-4 max-w-md mx-auto">
  <header class="flex items-center justify-between py-3 border-b border-slate-800">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center font-orbitron font-black text-white text-sm shadow-[0_0_12px_rgba(6,182,212,0.5)]">
        N
      </div>
      <div>
        <h1 class="font-orbitron font-bold text-white text-sm">CYBER TASK</h1>
        <p class="text-[10px] text-cyan-400">Android Capacitor App</p>
      </div>
    </div>
    <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
      v1.0.0
    </span>
  </header>

  <main class="flex-1 py-4 space-y-4">
    <!-- Stats Banner -->
    <div class="glass rounded-2xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(6,182,212,0.15)]">
      <div>
        <p class="text-[11px] text-slate-400">Total Tugas Aktif</p>
        <p id="totalTasks" class="font-orbitron font-black text-2xl text-cyan-300">3</p>
      </div>
      <div class="text-right">
        <p class="text-[11px] text-slate-400">Penyelesaian</p>
        <p id="compRate" class="font-orbitron font-bold text-sm text-purple-400">33%</p>
      </div>
    </div>

    <!-- Input Add Task -->
    <div class="glass rounded-2xl p-4 space-y-2">
      <h3 class="text-xs font-bold uppercase tracking-wider text-cyan-300">Tambah Tugas Baru</h3>
      <div class="flex gap-2">
        <input id="taskInput" type="text" placeholder="Tulis rencana / misi baru..." class="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400">
        <button onclick="addTask()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-xs font-bold text-white transition-all shadow-md active:scale-95">+</button>
      </div>
    </div>

    <!-- Task List -->
    <div class="space-y-2">
      <h3 class="text-xs font-semibold text-slate-400">Daftar Misi:</h3>
      <ul id="taskList" class="space-y-2">
        <li class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <input type="checkbox" onchange="toggleTask(this)" class="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer">
            <span class="text-xs text-slate-200">Rancang arsitektur bot WhatsApp</span>
          </div>
          <button onclick="this.parentElement.remove(); updateStats();" class="text-red-400 hover:text-red-300 text-xs px-2 py-1">✕</button>
        </li>
        <li class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <input type="checkbox" checked onchange="toggleTask(this)" class="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer">
            <span class="text-xs text-slate-400 line-through">Uji coba AI Image Generator</span>
          </div>
          <button onclick="this.parentElement.remove(); updateStats();" class="text-red-400 hover:text-red-300 text-xs px-2 py-1">✕</button>
        </li>
        <li class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <input type="checkbox" onchange="toggleTask(this)" class="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer">
            <span class="text-xs text-slate-200">Bangun file APK Android dengan Capacitor</span>
          </div>
          <button onclick="this.parentElement.remove(); updateStats();" class="text-red-400 hover:text-red-300 text-xs px-2 py-1">✕</button>
        </li>
      </ul>
    </div>
  </main>

  <footer class="py-3 text-center text-[10px] text-slate-500 border-t border-slate-800">
    Dibuat dengan NEXERA AI App Builder • Siap Build ke Android (.apk)
  </footer>

  <script>
    function updateStats() {
      const list = document.getElementById('taskList');
      const items = list.getElementsByTagName('li');
      const total = items.length;
      document.getElementById('totalTasks').innerText = total;
      let completed = 0;
      for (let i = 0; i < total; i++) {
        const checkbox = items[i].querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) completed++;
      }
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      document.getElementById('compRate').innerText = rate + '%';
    }

    function toggleTask(checkbox) {
      const span = checkbox.nextElementSibling;
      if (checkbox.checked) {
        span.className = 'text-xs text-slate-400 line-through';
      } else {
        span.className = 'text-xs text-slate-200';
      }
      updateStats();
    }

    function addTask() {
      const input = document.getElementById('taskInput');
      const text = input.value.trim();
      if (!text) return;
      const list = document.getElementById('taskList');
      const li = document.createElement('li');
      li.className = 'p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between animate-in fade-in';
      li.innerHTML = '<div class="flex items-center gap-2.5"><input type="checkbox" onchange="toggleTask(this)" class="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer"><span class="text-xs text-slate-200">' + text + '</span></div><button onclick="this.parentElement.remove(); updateStats();" class="text-red-400 hover:text-red-300 text-xs px-2 py-1">✕</button>';
      list.prepend(li);
      input.value = '';
      updateStats();
    }
  </script>
</body>
</html>`;

    return {
      id: 'app_default',
      name: 'Cyber Task Android',
      description: 'Aplikasi manajemen tugas futuristik dengan dukungan build APK Capacitor',
      files: {
        'index.html': defaultHtml,
        'styles.css': `/* Custom styles for Cyber Task */\n.glass-panel { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); }`,
        'app.js': `// Logic app\nconsole.log("Cyber Task initialized.");`,
        'capacitor.config.json': JSON.stringify({
          appId: 'com.nexera.cybertask',
          appName: 'Cyber Task',
          webDir: 'dist',
          bundledWebRuntime: false,
        }, null, 2),
        'package.json': JSON.stringify({
          name: 'cyber-task-mobile',
          version: '1.0.0',
          scripts: {
            build: 'echo "Ready for Capacitor packaging"',
            'cap:android': 'npx cap add android && npx cap sync android',
            'cap:open': 'npx cap open android',
          },
          dependencies: {
            '@capacitor/android': '^6.0.0',
            '@capacitor/cli': '^6.0.0',
            '@capacitor/core': '^6.0.0',
          },
        }, null, 2),
        'ANDROID_BUILD_GUIDE.md': `# Panduan Lengkap Build File .APK Android

Proyek ini telah dikonfigurasi penuh dengan **Apache Capacitor** agar dapat di-compile menjadi file **.apk** Android.

## Catatan Kejujuran Lingkungan (Environment Status):
Server cloud ini berfungsi sebagai Generator Proyek & Web Preview interaktif. Untuk mengkompilasi file fisik \`.apk\`, diperlukan compiler **Android SDK & Gradle**.

## Opsi 1: Build di Komputer Anda (Paling Mudah)
1. Ekstrak file ZIP project ini.
2. Buka terminal di folder hasil ekstrak, jalankan:
   \`\`\`bash
   npm install
   npx cap add android
   npx cap sync android
   \`\`\`
3. Buka project di Android Studio:
   \`\`\`bash
   npx cap open android
   \`\`\`
4. Di Android Studio, klik menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**. File \`.apk\` siap diinstal ke HP Android Anda!

## Opsi 2: Build APK Otomatis di Cloud (Gratis via GitHub Actions)
Kami telah menyertakan file \`.github/workflows/build-apk.yml\` di dalam paket ZIP. Anda cukup push project ke GitHub, dan GitHub Actions akan otomatis meng-compile file \`.apk\` untuk Anda unduh di tab Releases!`,
      },
      activeFile: 'index.html',
      previewHtml: defaultHtml,
      androidConfig: {
        appId: 'com.nexera.cybertask',
        appName: 'Cyber Task',
        capacitorConfig: '',
        buildGuide: '',
      },
      timestamp: 'Baru saja',
    };
  });

  const categories = [
    { id: 'productivity', label: 'Produktivitas & Catatan' },
    { id: 'utility', label: 'Utilitas & Alat' },
    { id: 'game', label: 'Game Santai / Kuis' },
    { id: 'ecommerce', label: 'Katalog & Toko Online' },
    { id: 'education', label: 'Edukasi & Belajar' },
  ];

  const handleGenerateApp = async () => {
    if (!prompt.trim() || loading) return;

    playClickSound();
    setLoading(true);

    try {
      const response = await fetch('/api/appbuilder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          appType: appCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.app) {
        throw new Error(data.error || 'Gagal menghasilkan aplikasi.');
      }

      playSuccessSound();

      const newProject: AppProject = {
        id: `app_${Date.now()}`,
        name: data.app.appName || 'Aplikasi AI Kustom',
        description: data.app.description || prompt,
        files: data.app.files,
        activeFile: 'index.html',
        previewHtml: data.app.previewHtml || data.app.files['index.html'] || '',
        androidConfig: {
          appId: data.app.appId || 'com.nexera.customapp',
          appName: data.app.appName || 'Nexera App',
          capacitorConfig: data.app.files['capacitor.config.json'] || '',
          buildGuide: data.app.files['ANDROID_BUILD_GUIDE.md'] || '',
        },
        timestamp: 'Baru saja',
      };

      setProject(newProject);
      setPreviewKey((k) => k + 1);
      setActiveMainView('preview');
    } catch (err: any) {
      console.error(err);
      alert(`Error membuat aplikasi: ${err.message || 'Silakan coba lagi.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFixCode = async () => {
    if (!fixIssue.trim() || fixing) return;

    playClickSound();
    setFixing(true);

    try {
      const currentCode = project.files[project.activeFile] || project.files['index.html'] || '';
      const response = await fetch('/api/appbuilder/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCode,
          issue: fixIssue,
          filename: project.activeFile,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.fixedCode) {
        throw new Error(data.error || 'Gagal memperbaiki kode.');
      }

      playSuccessSound();

      const updatedFiles = {
        ...project.files,
        [project.activeFile]: data.fixedCode,
      };

      // Also update preview if index.html was fixed
      const newPreview = project.activeFile === 'index.html' ? data.fixedCode : project.previewHtml;

      setProject((prev) => ({
        ...prev,
        files: updatedFiles,
        previewHtml: newPreview,
      }));

      setPreviewKey((k) => k + 1);
      setShowFixModal(false);
      setFixIssue('');
      alert('✅ Kode berhasil diperbaiki oleh AI!');
    } catch (err: any) {
      console.error(err);
      alert(`Gagal memperbaiki kode: ${err.message || 'Silakan coba lagi.'}`);
    } finally {
      setFixing(false);
    }
  };

  const copyCode = () => {
    playClickSound();
    const content = project.files[project.activeFile] || '';
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadProjectZip = async () => {
    playClickSound();
    const zip = new JSZip();

    // Add all project files
    Object.entries(project.files).forEach(([filename, content]) => {
      zip.file(filename, content);
    });

    // Add GitHub Actions Android APK Builder Workflow file
    const githubWorkflow = `name: Build Android APK
on: [push, workflow_dispatch]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'
      - name: Install Dependencies
        run: |
          npm install
          npx cap add android || true
          npx cap sync android
      - name: Build APK with Gradle
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug
      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-debug.apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
`;
    zip.file('.github/workflows/build-apk.yml', githubWorkflow);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-project.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner Studio */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-[#12082b] via-[#091538] to-[#041a2e] border border-purple-500/40 shadow-[0_0_35px_rgba(168,85,247,0.2)] backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-950/80 border border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  AI App Builder & APK Maker
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                  Capacitor Android
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ciptakan aplikasi mobile dan web dari instruksi teks, pratinjau langsung, dan unduh paket siap build APK.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-xs text-slate-300 self-start md:self-auto">
            <Info className="w-4 h-4 text-purple-400" />
            <span>Format Ekspor: <strong className="text-cyan-300">ZIP + Android Scaffold</strong></span>
          </div>
        </div>

        {/* Prompt Input Form */}
        <div className="mt-5 space-y-4 pt-4 border-t border-slate-800/80">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Tuliskan Ide Aplikasi yang Ingin Anda Buat:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="Contoh: Aplikasi kalkulator finansial dan pencatat pengeluaran harian dengan grafik persentase dan tema neon cyberpunk..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs sm:text-sm resize-none"
            />
          </div>

          {/* Category Selector & Generate Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-300 mr-1">Kategori:</span>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAppCategory(cat.id);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    appCategory === cat.id
                      ? 'bg-purple-950 border border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateApp}
              disabled={loading || !prompt.trim()}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Sedang Menyusun Proyek & Kode...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Aplikasi Lengkap</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Area (Preview / Editor / APK Guide) */}
      <div className="rounded-3xl bg-[#060c22]/90 border border-slate-800 shadow-xl overflow-hidden">
        {/* Sub-Header Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Main View Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playClickSound();
                setActiveMainView('preview');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMainView === 'preview'
                  ? 'bg-purple-950 border border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Preview Aplikasi Interaktif</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveMainView('editor');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMainView === 'editor'
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Editor Kode Project</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveMainView('android');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMainView === 'android'
                  ? 'bg-emerald-950 border border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Panduan Build APK</span>
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {/* AI Fix Code Button */}
            <button
              onClick={() => {
                playClickSound();
                setShowFixModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Perbaiki atau Tambah Fitur dengan AI"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Fix Code / Edit AI</span>
            </button>

            {/* Download Project ZIP */}
            <button
              onClick={downloadProjectZip}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Project (.ZIP)</span>
            </button>
          </div>
        </div>

        {/* View 1: Interactive Live Preview with Device Emulators */}
        {activeMainView === 'preview' && (
          <div className="p-4 sm:p-6 flex flex-col items-center justify-center space-y-4">
            {/* Device Switcher */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => setDeviceFrame('mobile')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  deviceFrame === 'mobile'
                    ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android Smartphone</span>
              </button>

              <button
                onClick={() => setDeviceFrame('tablet')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  deviceFrame === 'tablet'
                    ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>Tablet</span>
              </button>

              <button
                onClick={() => setDeviceFrame('desktop')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  deviceFrame === 'desktop'
                    ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Layar Penuh</span>
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  setPreviewKey((k) => k + 1);
                }}
                className="p-1.5 text-slate-400 hover:text-cyan-300 cursor-pointer ml-1"
                title="Muat Ulang Preview"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Device Frame Simulator */}
            <div
              className={`transition-all duration-300 bg-slate-950 border-4 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] relative ${
                deviceFrame === 'mobile'
                  ? 'w-[360px] h-[640px] border-slate-800'
                  : deviceFrame === 'tablet'
                  ? 'w-[600px] h-[640px] border-slate-800'
                  : 'w-full h-[640px] border-slate-800'
              }`}
            >
              {/* Phone Camera Notch on mobile frame */}
              {deviceFrame === 'mobile' && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-20 pointer-events-none flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-slate-950" />
                </div>
              )}

              <iframe
                key={previewKey}
                title="Application Live Preview"
                srcDoc={project.previewHtml || project.files['index.html']}
                className="w-full h-full border-none bg-[#030712]"
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              />
            </div>
          </div>
        )}

        {/* View 2: Multi-File Code Editor */}
        {activeMainView === 'editor' && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* File Switcher Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {Object.keys(project.files).map((file) => (
                <button
                  key={file}
                  onClick={() => {
                    playClickSound();
                    setProject((prev) => ({ ...prev, activeFile: file }));
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    project.activeFile === file
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-transparent'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{file}</span>
                </button>
              ))}
            </div>

            {/* Code Textarea Editor */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#020510]">
              <div className="p-2.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{project.activeFile} • Live Code Editing</span>
                <div className="flex items-center gap-3">
                  <button onClick={copyCode} className="hover:text-cyan-300 flex items-center gap-1 cursor-pointer">
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={project.files[project.activeFile] || ''}
                onChange={(e) => {
                  const updatedText = e.target.value;
                  const updatedFiles = {
                    ...project.files,
                    [project.activeFile]: updatedText,
                  };
                  const newPreview = project.activeFile === 'index.html' ? updatedText : project.previewHtml;
                  setProject((prev) => ({
                    ...prev,
                    files: updatedFiles,
                    previewHtml: newPreview,
                  }));
                }}
                rows={18}
                spellCheck={false}
                className="w-full p-4 font-mono text-xs sm:text-sm text-cyan-200 bg-transparent focus:outline-none resize-none leading-relaxed selection:bg-cyan-500/30"
              />
            </div>
          </div>
        )}

        {/* View 3: Android APK Generation Guide */}
        {activeMainView === 'android' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Honest Environment Transparency Box */}
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>Kejujuran Status Build APK & Lingkungan Android:</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">
                Server AI Studio saat ini adalah runtime container web cepat. Untuk menghasilkan file biner fisik <strong>.apk</strong> Android, diperlukan <strong>Android SDK & Gradle</strong>. 
                NEXERA AI telah secara otomatis menyiapkan struktur proyek <strong>Apache Capacitor</strong> lengkap dan file build cloud otomatis di dalam file ZIP yang Anda unduh!
              </p>
            </div>

            {/* 3 Step Build Process */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Opsi A: Build di Laptop / PC Anda</span>
                </h4>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Unduh file proyek ZIP dengan tombol di atas, lalu ekstrak.</li>
                  <li>Buka terminal di folder hasil ekstrak, jalankan perintah:
                    <div className="mt-1 p-2 rounded-lg bg-black font-mono text-[11px] text-cyan-300">
                      npm install<br/>
                      npx cap add android<br/>
                      npx cap sync android
                    </div>
                  </li>
                  <li>Buka proyek di Android Studio:
                    <div className="mt-1 p-2 rounded-lg bg-black font-mono text-[11px] text-purple-300">
                      npx cap open android
                    </div>
                  </li>
                  <li>Di Android Studio, klik menu <strong>Build &gt; Build APK(s)</strong>. File APK siap dipasang di HP Anda!</li>
                </ol>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-purple-400" />
                  <span>Opsi B: Build APK Otomatis di GitHub (Gratis)</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Kami telah menyertakan workflow <code>.github/workflows/build-apk.yml</code> di dalam file ZIP:
                </p>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Upload / Push folder proyek ke repositori GitHub Anda.</li>
                  <li>GitHub Actions akan otomatis menjalankan build Android SDK di cloud gratis.</li>
                  <li>File <strong>app-debug.apk</strong> akan langsung tersedia untuk diunduh di tab <strong>Actions &gt; Artifacts</strong>!</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Fix Code Modal */}
      {showFixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            onClick={() => setShowFixModal(false)}
          />

          <div className="relative w-full max-w-lg bg-[#070e24] border border-purple-500/40 rounded-3xl p-6 shadow-[0_0_40px_rgba(168,85,247,0.3)] z-10 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Wrench className="w-5 h-5 text-purple-400" />
              <span>Perbaiki atau Modifikasi Kode dengan AI</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              File aktif: <strong className="text-cyan-300 font-mono">{project.activeFile}</strong>
            </p>

            <div className="mt-4 space-y-3">
              <textarea
                value={fixIssue}
                onChange={(e) => setFixIssue(e.target.value)}
                rows={3}
                placeholder="Contoh: Perbaiki tombol agar animasi lebih smooth, atau tambahkan fitur kalkulator diskon persentase..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 resize-none"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFixModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>

                <button
                  onClick={handleFixCode}
                  disabled={fixing || !fixIssue.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
                >
                  {fixing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sedang Memperbaiki Kode...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Perbaiki Kode Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
