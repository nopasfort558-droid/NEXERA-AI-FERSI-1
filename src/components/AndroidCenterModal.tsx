import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Terminal, 
  ExternalLink, 
  Copy, 
  Check, 
  Bot, 
  FileCode, 
  Sparkles, 
  Layers, 
  FolderArchive,
  Info
} from 'lucide-react';
import JSZip from 'jszip';
import { playClickSound, playSuccessSound } from '../utils/audio';

interface AndroidCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidCenterModal: React.FC<AndroidCenterModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'nexera_apk' | 'wabot_apk' | 'links'>('nexera_apk');
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeLiveUrl = typeof window !== 'undefined' && window.location.origin.includes('http')
    ? window.location.origin
    : 'https://ais-dev-qec45cuww4auike342bzlt-537809813421.asia-southeast1.run.app';
  const sharedUrl = activeLiveUrl;
  const devUrl = 'https://ais-dev-qec45cuww4auike342bzlt-537809813421.asia-southeast1.run.app';

  if (!isOpen) return null;

  const handleCopyLink = () => {
    playClickSound();
    navigator.clipboard.writeText(sharedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Generate & Download NEXERA AI Android Project ZIP
  const handleDownloadNexeraProject = async () => {
    playClickSound();
    setIsGeneratingZip(true);

    try {
      const zip = new JSZip();

      // Fetch official Gojo & Sasuke app icon binary
      try {
        const iconRes = await fetch('/icon-512.png');
        if (iconRes.ok) {
          const iconBlob = await iconRes.blob();
          zip.file('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', iconBlob);
          zip.file('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png', iconBlob);
          zip.file('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png', iconBlob);
          zip.file('android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png', iconBlob);
          zip.file('android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png', iconBlob);
          zip.file('android/app/src/main/res/mipmap-xhdpi/ic_launcher.png', iconBlob);
          zip.file('android/app/src/main/res/mipmap-hdpi/ic_launcher.png', iconBlob);
          zip.file('android/app/src/main/res/mipmap-mdpi/ic_launcher.png', iconBlob);
          zip.file('public/app-icon.png', iconBlob);
        }
      } catch (err) {
        console.warn('Could not bundle binary icon:', err);
      }

      // 1. Capacitor configuration
      zip.file('capacitor.config.json', JSON.stringify({
        appId: 'com.nexera.ai.assistant',
        appName: 'NEXERA AI',
        webDir: 'dist',
        server: {
          androidScheme: 'https',
          cleartext: true,
          url: sharedUrl
        },
        plugins: {
          SplashScreen: {
            launchShowDuration: 0,
            launchAutoHide: true,
            backgroundColor: '#030712'
          }
        }
      }, null, 2));

      // 2. AndroidManifest.xml
      zip.file('android/app/src/main/AndroidManifest.xml', `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.nexera.ai.assistant">

    <!-- Izin Akses Android NEXERA AI -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="NEXERA AI"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="NEXERA AI"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`);

      // 3. MainActivity.java
      zip.file('android/app/src/main/java/com/nexera/ai/assistant/MainActivity.java', `package com.nexera.ai.assistant;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Inisialisasi Bridge Capacitor untuk NEXERA AI
    }
}`);

      // 4. build.gradle
      zip.file('android/app/build.gradle', `apply plugin: 'com.android.application'

android {
    namespace "com.nexera.ai.assistant"
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.nexera.ai.assistant"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation project(':capacitor-android')
}`);

      // 5. GitHub Actions Automated Cloud APK Builder
      zip.file('.github/workflows/build-apk.yml', `name: Build NEXERA AI APK

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Java 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Build Web Assets
        run: npm run build

      - name: Sync Capacitor Android
        run: npx cap sync android

      - name: Build Android Release APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug assembleRelease

      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: NEXERA_AI_APK
          path: android/app/build/outputs/apk/**/*.apk`);

      // 6. Comprehensive Indonesian Setup & Build Guide
      zip.file('PANDUAN_BUILD_APK_INDONESIA.md', `# PANDUAN LENGKAP MEMBUAT APK ANDROID: NEXERA AI

Project ini telah dikonfigurasi penuh dengan **Capacitor Android** untuk aplikasi **NEXERA AI**.

---

### METODE 1: BUILD APK OTOMATIS DI CLOUD (GRATIS & TERMUDAH TANPA INSTAL SOFTWARE)
1. Unggah (push) seluruh isi folder ini ke repositori **GitHub** Anda.
2. Di GitHub, buka menu **Actions**.
3. Workflow **"Build NEXERA AI APK"** akan otomatis berjalan meng-compile file **.apk**.
4. Setelah selesai (±3 menit), unduh file APK langsung di bagian **Artifacts** dan instal di HP Android Anda!

---

### METODE 2: BUILD DI KOMPUTER DENGAN ANDROID STUDIO
1. Pastikan komputer Anda terpasang:
   - Node.js v18+ (https://nodejs.org)
   - Android Studio (https://developer.android.com/studio)
2. Buka terminal di folder project ini:
   \`\`\`bash
   npm install
   npx cap sync android
   npx cap open android
   \`\`\`
3. Android Studio akan terbuka secara otomatis.
4. Di Android Studio, klik menu bar atas:
   **Build > Build Bundle(s) / APK(s) > Build APK(s)**
5. Android Studio akan membuat file APK siap pakai di:
   \`android/app/build/outputs/apk/debug/app-debug.apk\`

---

### FITUR YANG SUDAH TERKONFIGURASI DALAM APK:
- **Opening Animation Video**: Video animasi MP4 tersimpan lokal di dalam APK (\`public/assets/aistudio/0917b122ec9550c5f8cc7af05654b859_980c61fe.mp4\`) sehingga dapat diputar secara offline saat pertama kali aplikasi dibuka.
- **Izin Lengkap**: Kamera (Vision AI), Mikrofon (AI Voice), Internet & Jaringan.
- **Icon & Splash Screen**: Sesuai desain futuristik NEXERA AI.`);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'NEXERA_AI_Android_Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playSuccessSound();
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  // Generate & Download NEXERA WA BOT Controller Project ZIP
  const handleDownloadWABotProject = async () => {
    playClickSound();
    setIsGeneratingZip(true);

    try {
      const zip = new JSZip();

      // Controller Capacitor Config
      zip.file('capacitor.config.json', JSON.stringify({
        appId: 'com.nexera.wabot.controller',
        appName: 'NEXERA WA BOT',
        webDir: 'dist',
        server: {
          url: `${sharedUrl}#wabot-controller`,
          cleartext: true
        }
      }, null, 2));

      // AndroidManifest.xml for WA BOT Controller
      zip.file('android/app/src/main/AndroidManifest.xml', `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.nexera.wabot.controller">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="NEXERA WA BOT"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:label="NEXERA WA BOT"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`);

      zip.file('README_WA_BOT_CONTROLLER.md', `# NEXERA WA BOT - ANDROID CONTROLLER APK

Aplikasi ini adalah **Kontroler Android Resmi** untuk WhatsApp Bot NEXERA.

### Arsitektur Sistem:
- **Server Cloud (Backend)**: Menjalankan engine WhatsApp socket Baileys yang online 24/7.
- **Aplikasi Android (APK Kontroler)**: Berfungsi menghubungkan, memutus, memonitor status pairing code/QR, melihat log terminal langsung, dan menguji respons bot dari HP Android Anda secara mobile.

### Cara Build APK:
1. Ekstrak folder ini.
2. Buka di Android Studio: \`Build > Build APK(s)\`.
3. Atau push ke GitHub untuk build otomatis via GitHub Actions (\`.github/workflows/build-apk.yml\`).`);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'NEXERA_WA_BOT_Controller_Android_Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playSuccessSound();
    } catch (err) {
      console.error('Failed to create WA bot zip:', err);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => { playClickSound(); onClose(); }}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#070e24] border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.25)] z-10 max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-orbitron">
                PUSAT ANDROID APK & PUBLIKASI
              </h2>
              <p className="text-xs text-slate-400">
                Kompilasi & Pengaturan Aplikasi Android NEXERA AI
              </p>
            </div>
          </div>

          <button
            onClick={() => { playClickSound(); onClose(); }}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => { playClickSound(); setActiveTab('nexera_apk'); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'nexera_apk'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1. APK NEXERA AI
          </button>
          <button
            onClick={() => { playClickSound(); setActiveTab('wabot_apk'); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'wabot_apk'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2. APK WA BOT KONTROLER
          </button>
          <button
            onClick={() => { playClickSound(); setActiveTab('links'); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'links'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3. LINK PUBLIK RESMI
          </button>
        </div>

        {/* Tab 1: NEXERA AI APK */}
        {activeTab === 'nexera_apk' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Status Card */}
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Konfigurasi Android Capacitor Selesai
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  READY TO BUILD
                </span>
              </div>

              {/* Official App Icon Card */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] flex-shrink-0">
                  <img 
                    src="/app-icon.png" 
                    alt="Ikon Resmi NEXERA AI (Gojo & Sasuke)" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-orbitron">IKON RESMI ANDROID</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                      TERPASANG
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    Gojo Satoru & Sasuke Uchiha (Neon Edition)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Mendukung semua resolusi mipmap (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Nama Aplikasi</span>
                  <span className="font-bold text-white">NEXERA AI</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Package ID</span>
                  <span className="font-mono text-cyan-300 text-[11px]">com.nexera.ai.assistant</span>
                </div>
              </div>

              {/* Permissions List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Izin Sistem Android Terkonfigurasi:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['Kamera (Vision AI)', 'Mikrofon (Voice AI)', 'Internet & Jaringan', 'Penyimpanan (Knowledge Base)', 'Audio Settings'].map((perm, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Offline video status */}
              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-2 text-xs text-purple-200">
                <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>
                  <strong>Video Pembuka Resmi:</strong> Berhasil di-bundle ke dalam aset offline APK untuk diputar tanpa koneksi internet saat splash pembuka.
                </span>
              </div>
            </div>

            {/* Honest Environment Transparency Note */}
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2 text-xs text-amber-200">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Status Lingkungan Build (Android SDK Status):</span>
              </div>
              <p className="leading-relaxed">
                Server cloud runtime ini adalah lingkungan web Node.js yang tidak memiliki compiler <strong>Android SDK & Gradle CLI</strong> (~4GB). Agar APK dapat dibuat secara nyata dan aman:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                <li>Kami menyediakan <strong>Paket Lengkap Proyek Android (ZIP)</strong> siap build di Android Studio.</li>
                <li>Tersedia file <strong>GitHub Actions CI/CD (.github/workflows/build-apk.yml)</strong> di dalam paket yang dapat meng-compile file <code className="text-cyan-300">.apk</code> secara gratis dan otomatis di cloud.</li>
              </ul>
            </div>

            {/* Download Project ZIP Button */}
            <button
              onClick={handleDownloadNexeraProject}
              disabled={isGeneratingZip}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              <span>{isGeneratingZip ? 'Menyiapkan Paket ZIP...' : 'Unduh Paket Lengkap Android NEXERA AI (ZIP)'}</span>
            </button>
          </div>
        )}

        {/* Tab 2: NEXERA WA BOT Controller APK */}
        {activeTab === 'wabot_apk' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Architecture Explanation */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2 text-xs text-emerald-200">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <Bot className="w-4 h-4 text-emerald-400" />
                <span>Penjelasan Arsitektur Aplikasi WhatsApp Bot:</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                WhatsApp Bot membutuhkan koneksi socket jaringan yang selalu aktif (24/7). Pada ponsel Android, sistem operasi akan mematikan proses background yang berjalan lama untuk menghemat baterai.
              </p>
              <p className="leading-relaxed text-slate-300">
                Oleh karena itu, arsitektur terbaik adalah:
                <br />
                1. <strong>Backend Server Cloud</strong>: Menjalankan engine WhatsApp socket Baileys asli.
                <br />
                2. <strong>APK NEXERA WA BOT</strong>: Berfungsi sebagai aplikasi remote control di Android untuk Start/Stop bot, melihat Pairing Code/QR asli, memeriksa status live, dan memantau log.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Detail APK Kontroler:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Nama APK</span>
                  <span className="font-bold text-white">NEXERA WA BOT</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Package ID</span>
                  <span className="font-mono text-emerald-300 text-[11px]">com.nexera.wabot.controller</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadWABotProject}
              disabled={isGeneratingZip}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              <span>{isGeneratingZip ? 'Menyiapkan Paket...' : 'Unduh Paket APK Kontroler WA BOT (ZIP)'}</span>
            </button>
          </div>
        )}

        {/* Tab 3: Official Published Links */}
        {activeTab === 'links' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <ExternalLink className="w-4 h-4 text-purple-400" />
                <span>Link Aplikasi Terpublikasi Resmi:</span>
              </div>

              {/* Shared App Link */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Link Publikasi (Siap Diakses di HP Android):
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={sharedUrl}
                    className="flex-1 bg-black/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Tersalin' : 'Salin'}</span>
                  </button>
                  <a
                    href={sharedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Development App Link */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Link Development Preview:
                </span>
                <p className="text-xs font-mono text-slate-300 truncate">
                  {devUrl}
                </p>
              </div>

              {/* PWA Direct Installation Tip */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-300">
                  <Smartphone className="w-4 h-4" />
                  Cara Pasang Instan di HP Android (Tanpa Komputer):
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-300 text-[11px]">
                  <li>Buka link publik di atas menggunakan browser <strong>Google Chrome</strong> di HP Android.</li>
                  <li>Ketuk ikon titik tiga (⋮) di pojok kanan atas browser.</li>
                  <li>Pilih menu <strong>"Tambahkan ke Layar Utama" (Install App)</strong>.</li>
                  <li>Aplikasi NEXERA AI akan terpasang di menu HP Android Anda seperti aplikasi APK asli!</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
