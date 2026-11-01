import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Brain,
  MessageSquare,
  Sparkles,
  Smartphone,
  QrCode,
  ShieldCheck,
  Play,
  RotateCcw,
  Power,
  Copy,
  Check,
  Terminal,
  Zap,
  Gamepad2,
  Sticker,
  UserCheck,
  Settings,
  ChevronRight,
  Send,
  Download,
  Code2,
  Award,
  Users,
  EyeOff,
  Flame,
  HelpCircle,
  Clock,
  Radio,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import JSZip from 'jszip';
import { 
  WAAiProvider,
  ChatGPTModel,
  GrokModel,
  WASpeechStyle, 
  WAGroupMode, 
  WABotConfig, 
  WAConnectionStatus 
} from '../types';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const WABotTab: React.FC = () => {
  // Stepper / Sub-navigation
  const [activeStep, setActiveStep] = useState<'create' | 'connect' | 'test' | 'code'>('create');

  // Bot Configuration State (Empty default phone numbers - no hardcoded values)
  const [botConfig, setBotConfig] = useState<WABotConfig>({
    id: 'nexera_wa_bot',
    name: 'NEXERA AI Bot',
    ownerPhone: '',
    aiProvider: 'chatgpt',
    aiModel: 'gpt-4o-mini',
    speechStyle: 'santai',
    customPrompt: '',
    features: {
      aiAutoReply: true,
      customCommands: true,
      miniGames: true,
      stickerMaker: true,
      welcomeMessage: true,
      antiSpam: true,
      ownerAdmin: true,
    },
    groupMode: 'mention_only',
    allowPrivate: true,
    allowGroup: true,
    connectionMethod: 'pairing',
    phoneNumber: '',
    welcomeText: 'Halo! Saya bot WhatsApp cerdas ditenagai oleh NEXERA AI. Ketik .menu untuk melihat fitur yang tersedia.',
    prefix: '.',
  });

  // Track initial hydration so polling does NOT overwrite user draft changes
  const hasHydratedConfig = useRef(false);

  // Server Connection & Runtime State
  const [connStatus, setConnStatus] = useState<WAConnectionStatus>('disconnected');
  const [pairingCode, setPairingCode] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [phoneInput, setPhoneInput] = useState(''); // Strict empty default!
  const [phoneError, setPhoneError] = useState('');
  const [connMethodTab, setConnMethodTab] = useState<'pairing' | 'qr'>('pairing');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // QR Code auto-refresh timer (60s countdown)
  const [qrSecondsLeft, setQrSecondsLeft] = useState(60);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);

  // Backend API Key status
  const [providerStatus, setProviderStatus] = useState<{
    chatgpt: { hasKey: boolean; providerName: string };
    grok: { hasKey: boolean; providerName: string };
  }>({
    chatgpt: { hasKey: false, providerName: 'OpenAI ChatGPT' },
    grok: { hasKey: false, providerName: 'xAI Grok (Persona Rudi)' },
  });

  // Live Logs & Statistics
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string }>>([
    { timestamp: new Date().toLocaleTimeString('id-ID'), level: 'INFO', message: 'NEXERA WA Controller siap digunakan.' }
  ]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalReplies: 0,
    stickersCreated: 0,
    gamesPlayed: 0,
    uptimeStart: null as string | null,
  });
  const [leaderboard, setLeaderboard] = useState<Array<{ name: string; score: number; gamesWon: number }>>([]);

  // Sandbox Test Simulator
  const [simMessage, setSimMessage] = useState('');
  const [simSender, setSimSender] = useState('Budi Pratama');
  const [simIsGroup, setSimIsGroup] = useState(false);
  const [simChat, setSimChat] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string; actionType?: string }>>([
    {
      sender: 'bot',
      text: '🤖 *NEXERA WA BOT ONLINE*\nHalo! Kirimkan *.menu* untuk melihat fitur atau kirim pertanyaan langsung untuk mengobrol dengan AI.',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Code Export State
  const [activeFile, setActiveFile] = useState<'index.js' | 'package.json' | '.env.example' | 'README.md'>('index.js');
  const [copiedFile, setCopiedFile] = useState(false);

  // Fetch bot status from server (Updates connection state, does NOT overwrite user form)
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/wabot/status');
      const data = await res.json();
      if (data.success && data.state) {
        const s = data.state;
        setConnStatus(s.status || 'disconnected');
        if (s.pairingCode) setPairingCode(s.pairingCode);
        if (s.qrCodeDataUrl) setQrCodeDataUrl(s.qrCodeDataUrl);
        if (Array.isArray(s.logs)) setLogs(s.logs);
        if (s.stats) setStats(s.stats);
        if (Array.isArray(s.leaderboard)) setLeaderboard(s.leaderboard);
        if (s.providerStatus) setProviderStatus(s.providerStatus);

        // Hydrate config ONLY on initial load to prevent user form selections from bouncing or resetting
        if (!hasHydratedConfig.current && s.config) {
          hasHydratedConfig.current = true;
          setBotConfig((prev) => ({
            ...prev,
            ...s.config,
            // Ensure phone number is not dirty sample
            phoneNumber: (s.config.phoneNumber === '6281234567890' || s.config.phoneNumber === '628123456789') ? '' : s.config.phoneNumber || '',
            ownerPhone: (s.config.ownerPhone === '6281234567890' || s.config.ownerPhone === '628123456789') ? '' : s.config.ownerPhone || '',
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch WA Bot status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // QR Code 60-second auto-refresh countdown
  useEffect(() => {
    if (activeStep === 'connect' && connMethodTab === 'qr' && connStatus === 'waiting_qr') {
      const timer = setInterval(() => {
        setQrSecondsLeft((prev) => {
          if (prev <= 1) {
            handleRefreshQr(false);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setQrSecondsLeft(60);
    }
  }, [activeStep, connMethodTab, connStatus]);

  // Persist Bot Config to Backend
  const handleSaveConfig = async (notify = true) => {
    playClickSound();
    setIsSavingConfig(true);
    setSaveSuccessMsg(false);
    try {
      const res = await fetch('/api/wabot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botConfig),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan konfigurasi.');
      if (data.config) {
        setBotConfig((prev) => ({ ...prev, ...data.config }));
      }
      if (notify) {
        playSuccessSound();
        setSaveSuccessMsg(true);
        setTimeout(() => setSaveSuccessMsg(false), 3000);
      }
    } catch (err: any) {
      alert(`Error simpan konfigurasi: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Helper to instantly update and sync bot config so changes never get lost
  const updateConfigValue = (patch: Partial<WABotConfig>) => {
    setBotConfig((prev) => {
      const updated = { ...prev, ...patch };
      // Auto-sync in background without blocking
      fetch('/api/wabot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch((e) => console.warn('Background auto-save error:', e));
      return updated;
    });
  };

  // Switch Provider and set default model accordingly
  const handleSelectProvider = (provider: WAAiProvider) => {
    playClickSound();
    const defaultModel = provider === 'grok' ? 'grok-beta' : 'gpt-4o-mini';
    updateConfigValue({
      aiProvider: provider,
      aiModel: defaultModel,
    });
  };

  // Validate Phone Number
  const validatePhone = (num: string): boolean => {
    const clean = num.replace(/[^0-9]/g, '');
    if (!clean) {
      setPhoneError('Nomor WhatsApp wajib diisi.');
      return false;
    }
    if (clean.length < 9) {
      setPhoneError('Nomor WhatsApp terlalu pendek (minimal 9 digit).');
      return false;
    }
    if (clean.length > 16) {
      setPhoneError('Nomor WhatsApp terlalu panjang (maksimal 16 digit).');
      return false;
    }
    if (!clean.startsWith('62') && !clean.startsWith('1') && !clean.startsWith('44') && !clean.startsWith('81')) {
      setPhoneError('Pastikan nomor diawali dengan kode negara, contoh: 628xxxxxxxxxx.');
      return false;
    }
    setPhoneError('');
    return true;
  };

  // Connect WhatsApp via Pairing Code
  const handleConnectPairing = async () => {
    playClickSound();
    setPhoneError('');
    const cleanPhone = phoneInput.replace(/[^0-9]/g, '');

    if (!validatePhone(cleanPhone)) {
      return;
    }

    setIsConnecting(true);
    try {
      // 1. Sync config with phone number
      await fetch('/api/wabot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...botConfig,
          phoneNumber: cleanPhone,
          connectionMethod: 'pairing',
        }),
      });

      // 2. Request pairing code from backend
      const res = await fetch('/api/wabot/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'pairing',
          phoneNumber: cleanPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Gagal meminta Pairing Code.');

      playSuccessSound();
      fetchStatus();
    } catch (err: any) {
      setPhoneError(err.message || 'Gagal meminta kode pairing.');
      alert(err.message || 'Gagal meminta kode pairing.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Connect WhatsApp via QR Code
  const handleConnectQr = async () => {
    playClickSound();
    setIsConnecting(true);
    try {
      await fetch('/api/wabot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...botConfig,
          connectionMethod: 'qr',
        }),
      });

      const res = await fetch('/api/wabot/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'qr',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Gagal meminta QR Code.');

      playSuccessSound();
      setQrSecondsLeft(60);
      fetchStatus();
    } catch (err: any) {
      alert(err.message || 'Gagal memulai koneksi QR.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Refresh QR Code
  const handleRefreshQr = async (sound = true) => {
    if (sound) playClickSound();
    setIsRefreshingQr(true);
    try {
      const res = await fetch('/api/wabot/refresh-qr', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setQrSecondsLeft(60);
        fetchStatus();
      }
    } catch (err) {
      console.warn('Refresh QR failed:', err);
    } finally {
      setIsRefreshingQr(false);
    }
  };

  // Reconnect WhatsApp
  const handleReconnect = async () => {
    playClickSound();
    setIsConnecting(true);
    try {
      const res = await fetch('/api/wabot/reconnect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghubungkan ulang.');
      playSuccessSound();
      fetchStatus();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect / Reset WhatsApp session
  const handleDisconnect = async (purge = false) => {
    playClickSound();
    if (purge && !confirm('Putus total sesi WhatsApp dan hapus kredensial dari server? Anda perlu menautkan kembali.')) {
      return;
    }

    try {
      const res = await fetch('/api/wabot/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purgeAuth: purge }),
      });
      const data = await res.json();
      if (data.state) {
        setConnStatus('disconnected');
        setPairingCode('');
        setQrCodeDataUrl('');
        setPhoneInput('');
        setPhoneError('');
        if (Array.isArray(data.state.logs)) setLogs(data.state.logs);
      }
      playSuccessSound();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Reset / Cancel Pairing Form
  const handleResetPairingForm = () => {
    playClickSound();
    setPhoneInput('');
    setPhoneError('');
    setPairingCode('');
    updateConfigValue({ phoneNumber: '' });
  };

  // Send Test Message into Sandbox Simulator
  const handleSendTestMessage = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const msgToSend = (customMsg || simMessage).trim();
    if (!msgToSend || isSendingTest) return;

    playClickSound();
    setIsSendingTest(true);
    setSimMessage('');

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setSimChat((prev) => [...prev, { sender: 'user', text: msgToSend, time: timeStr }]);

    try {
      const res = await fetch('/api/wabot/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgToSend,
          senderName: simSender,
          isGroup: simIsGroup,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSimChat((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.reply || 'Pesan diabaikan oleh filter.',
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            actionType: data.actionType,
          },
        ]);
        if (data.state && Array.isArray(data.state.logs)) {
          setLogs(data.state.logs);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Copy Pairing Code
  const copyPairingCode = () => {
    if (!pairingCode) return;
    playClickSound();
    navigator.clipboard.writeText(pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Speech styles definition
  const speechStyles: Array<{ id: WASpeechStyle; label: string; badge: string; desc: string; sample: string }> = [
    {
      id: 'santai',
      label: 'Santai & Gaul',
      badge: 'Paling Populer',
      desc: 'Asik, friendly, tidak kaku, bahasa sehari-hari akrab tanpa bertele-tele.',
      sample: 'Yo santai aja bro, ada yang bisa kubantu hari ini? Langsung to the point aja ya!',
    },
    {
      id: 'formal',
      label: 'Formal & Profesional',
      badge: 'Instansi / Bisnis',
      desc: 'Sopan, tertib, berwibawa, tata bahasa baku yang menghormati pengguna.',
      sample: 'Selamat datang. Kami siap membantu kebutuhan informasi dan layanan Anda dengan cepat.',
    },
    {
      id: 'lucu',
      label: 'Lucu & Humoris',
      badge: 'Ceria & Jenaka',
      desc: 'Menghibur dengan selera humor cerdas, ceria, dan tidak memaksakan lelucon garing.',
      sample: 'Waduh siap meluncur! Jangan galau, otak AI-ku siap bikin harimu lebih cerah.',
    },
    {
      id: 'islami',
      label: 'Islami & Santun',
      badge: 'Penuh Adab',
      desc: 'Santun, salam hangat islami, mendoakan kebaikan, dan beretika tinggi.',
      sample: 'Assalamu\'alaikum Warahmatullahi Wabarakatuh. Semoga hari Anda diberkahi kebaikan.',
    },
    {
      id: 'cs',
      label: 'Customer Service',
      badge: 'Toko Online',
      desc: 'Sigap, solutif, empati tinggi, memberikan format bantuan cepat dan jelas.',
      sample: 'Halo! Tim Support kami siap membantu pertanyaan katalog, pesanan, atau komplain Anda.',
    },
    {
      id: 'gojo',
      label: 'Anime: Gojo Satoru',
      badge: 'Jujutsu Kaisen',
      desc: 'Santai, cool, sangat pede ("Watashi saikyou dakara!"), karismatik dan cerdas.',
      sample: 'Yo! Daijoubu, boku saikyou dakara! Sensei ada di sini, masalahmu beres dalam sekejap!',
    },
    {
      id: 'sasuke',
      label: 'Anime: Sasuke Uchiha',
      badge: 'Naruto',
      desc: 'Tenang, dingin ("Hmph..."), sangat analitis, hemat bicara, namun solutif tajam.',
      sample: '...Hmph. Katakan apa tujuanmu, jangan buang waktu dengan basa-basi yang tidak perlu.',
    },
    {
      id: 'custom',
      label: 'Gaya Custom Pribadi',
      badge: 'Kustom Bebas',
      desc: 'Tulis instruksi persona dan gaya bicara unik Anda sendiri sesuka hati.',
      sample: 'Menyesuaikan instruksi khusus yang Anda ketikkan.',
    },
  ];

  // Group modes definition
  const groupModes: Array<{ id: WAGroupMode; label: string; desc: string; icon: any }> = [
    {
      id: 'mention_only',
      label: 'Hanya Jika Dipanggil',
      desc: 'Bot hanya membalas jika nama bot disebut, di-tag (@bot), atau pesan dibalas.',
      icon: Users,
    },
    {
      id: 'active',
      label: 'Mode Aktif',
      desc: 'Bot membalas semua pesan obrolan dan perintah grup sesuai fitur yang aktif.',
      icon: Flame,
    },
    {
      id: 'silent',
      label: 'Mode Diam / Fokus',
      desc: 'Bot diam di grup, hanya merespon jika ada perintah diawali prefix (contoh: .menu).',
      icon: EyeOff,
    },
  ];

  // Code files generator
  const generatedFiles = {
    'index.js': `/**
 * ${botConfig.name.toUpperCase()} - Dibuat dengan NEXERA AI WA Bot Builder
 * Provider: ${botConfig.aiProvider.toUpperCase()} | Model: ${botConfig.aiModel} | Gaya: ${botConfig.speechStyle}
 */
import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion, 
  downloadMediaMessage 
} from '@whiskeysockets/baileys';
import pino from 'pino';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config();

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: ['${botConfig.name}', 'Chrome', '122.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ [${botConfig.name}] Berhasil terhubung ke WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const jid = m.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    const text = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim();
    const p = '${botConfig.prefix}';

    // 1. Group Filtering (${botConfig.groupMode})
    if (isGroup) {
      ${botConfig.groupMode === 'silent' ? `if (!text.startsWith(p)) return;` : ''}
      ${botConfig.groupMode === 'mention_only' ? `if (!text.startsWith(p) && !text.toLowerCase().includes('${botConfig.name.toLowerCase()}')) return;` : ''}
    }

    // 2. Command Menu
    if (text === \`\${p}menu\`) {
      await sock.sendMessage(jid, { 
        text: \`*🤖 \${${JSON.stringify(botConfig.name)}} - MENU*\\n\\n\` +
              \`• \${p}menu : Menampilkan menu ini\\n\` +
              \`• \${p}ping : Tes latensi bot\\n\` +
              \`• \${p}info : Informasi sistem\\n\` +
              \`• \${p}tebak : Mini-game tebak-tebakan\\n\` +
              \`• \${p}sticker : Buat stiker dari foto\\n\\n\` +
              \`_Ditenagai oleh NEXERA AI WA Bot Builder_\`
      }, { quoted: m });
      return;
    }

    if (text === \`\${p}ping\`) {
      await sock.sendMessage(jid, { text: '🏓 Pong! Bot aktif & responsif.' }, { quoted: m });
      return;
    }

    // 3. AI Auto-Reply (${botConfig.aiProvider})
    if (${botConfig.features.aiAutoReply} && text.length > 0) {
      const endpoint = '${botConfig.aiProvider === 'grok' ? 'https://api.x.ai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'}';
      const apiKey = process.env.${botConfig.aiProvider === 'grok' ? 'XAI_API_KEY' : 'OPENAI_API_KEY'};
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${apiKey}\`
        },
        body: JSON.stringify({
          model: '${botConfig.aiModel}',
          messages: [
            { role: 'system', content: '${botConfig.aiProvider === 'grok' ? 'Kamu adalah Rudi si red panda cerdas dan ramah. ' : ''}Nama bot: "${botConfig.name}". Gaya bicara: "${botConfig.speechStyle}". Berikan respon cerdas, padat, alami dalam Bahasa Indonesia tanpa selalu mengakhiri dengan pertanyaan.' },
            { role: 'user', content: text }
          ]
        })
      });
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'Maaf, ada kendala respon AI.';
      await sock.sendMessage(jid, { text: reply }, { quoted: m });
    }
  });
}

startBot();`,
    'package.json': JSON.stringify({
      name: botConfig.name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      type: 'module',
      scripts: {
        start: 'node index.js',
      },
      dependencies: {
        '@whiskeysockets/baileys': '^6.7.8',
        pino: '^9.0.0',
        sharp: '^0.33.5',
        dotenv: '^16.4.5',
      },
    }, null, 2),
    '.env.example': botConfig.aiProvider === 'grok' 
      ? `XAI_API_KEY="xai-..."\nBOT_NAME="${botConfig.name}"\nPREFIX="${botConfig.prefix}"`
      : `OPENAI_API_KEY="sk-..."\nBOT_NAME="${botConfig.name}"\nPREFIX="${botConfig.prefix}"`,
    'README.md': `# ${botConfig.name} - WhatsApp Bot Project\n\nDibuat otomatis dengan **NEXERA AI WA Bot Builder**.\nProvider AI: **${botConfig.aiProvider.toUpperCase()}** (${botConfig.aiModel})\n\n## Cara Menjalankan:\n1. Ekstrak file ini.\n2. Buka terminal di folder ini.\n3. Jalankan \`npm install\`\n4. Salin \`.env.example\` ke \`.env\` dan masukkan ${botConfig.aiProvider === 'grok' ? 'XAI_API_KEY' : 'OPENAI_API_KEY'}.\n5. Jalankan \`npm start\`\n6. Masukkan nomor WhatsApp atau scan QR untuk menautkan perangkat!`,
  };

  const downloadZip = async () => {
    playClickSound();
    const zip = new JSZip();
    zip.file('index.js', generatedFiles['index.js']);
    zip.file('package.json', generatedFiles['package.json']);
    zip.file('.env.example', generatedFiles['.env.example']);
    zip.file('README.md', generatedFiles['README.md']);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${botConfig.name.toLowerCase().replace(/\s+/g, '-')}-bot.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playSuccessSound();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Cyber Hero Header */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-[#031525] via-[#091b38] to-[#160a33] border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.18)] backdrop-blur-xl relative overflow-hidden">
        {/* Glow accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <div className="w-full h-full rounded-[14px] bg-slate-950/80 flex items-center justify-center text-cyan-300">
                <Bot className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  WA Bot Builder Platform
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold tracking-wider uppercase">
                  ChatGPT + Grok AI Rudi
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Pilih otak AI (ChatGPT atau Grok Rudi), gaya bicara, fitur otomatis, lalu hubungkan dengan Pairing Code 8 digit atau scan QR tanpa konfigurasi ribet.
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex flex-col items-start md:items-end gap-1.5 self-start md:self-auto">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-bold transition-all shadow-md ${
              connStatus === 'connected'
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : connStatus === 'waiting_code' || connStatus === 'waiting_qr' || connStatus === 'connecting'
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 animate-pulse'
                : 'bg-slate-900/90 border-slate-700 text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                connStatus === 'connected'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : connStatus === 'waiting_code' || connStatus === 'waiting_qr' || connStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`} />
              <span>
                Status: {connStatus === 'connected' ? 'TERHUBUNG (CONNECTED)' : connStatus === 'waiting_code' ? 'MENUNGGU KODE PAIRING' : connStatus === 'waiting_qr' ? 'MENUNGGU SCAN QR' : connStatus === 'connecting' ? 'SEDANG MENGHUBUNGKAN...' : 'DISCONNECTED'}
              </span>
            </div>

            {connStatus === 'connected' && (
              <span className="text-[10px] text-emerald-400 font-mono">
                Akun: +{botConfig.phoneNumber || 'Aktif'}
              </span>
            )}
          </div>
        </div>

        {/* 4-Step Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => {
              playClickSound();
              setActiveStep('create');
            }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              activeStep === 'create'
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeStep === 'create' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
              <Brain className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Langkah 1 & 2</p>
              <p className="text-xs font-bold text-white truncate">Otak AI & Gaya Bicara</p>
            </div>
          </button>

          <button
            onClick={() => {
              playClickSound();
              handleSaveConfig(false);
              setActiveStep('connect');
            }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              activeStep === 'connect'
                ? 'bg-purple-950/90 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeStep === 'connect' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Langkah 3</p>
              <p className="text-xs font-bold text-white truncate">Koneksi WhatsApp</p>
            </div>
          </button>

          <button
            onClick={() => {
              playClickSound();
              handleSaveConfig(false);
              setActiveStep('test');
            }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              activeStep === 'test'
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeStep === 'test' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
              <Play className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Langkah 4</p>
              <p className="text-xs font-bold text-white truncate">Uji Sandbox Chat</p>
            </div>
          </button>

          <button
            onClick={() => {
              playClickSound();
              handleSaveConfig(false);
              setActiveStep('code');
            }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              activeStep === 'code'
                ? 'bg-blue-950/90 border-blue-400 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeStep === 'code' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
              <Code2 className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Ekspor Script</p>
              <p className="text-xs font-bold text-white truncate">Unduh Proyek ZIP</p>
            </div>
          </button>
        </div>
      </div>

      {/* STEP 1: CREATE BOT (Nama, Otak AI ChatGPT / Grok Rudi, Gaya Bicara & Fitur) */}
      {activeStep === 'create' && (
        <div className="space-y-6">
          {/* Card 1: Identitas & Pengaturan Dasar */}
          <div className="rounded-3xl p-6 bg-[#040d21]/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Identitas & Konfigurasi Bot</h3>
              </div>
              <div className="flex items-center gap-2">
                {saveSuccessMsg && (
                  <span className="text-xs font-semibold text-emerald-400 animate-in fade-in flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Tersimpan!
                  </span>
                )}
                <button
                  onClick={() => handleSaveConfig(true)}
                  disabled={isSavingConfig}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  {isSavingConfig ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Simpan Konfigurasi</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Bot Anda:
                </label>
                <input
                  type="text"
                  value={botConfig.name}
                  onChange={(e) => updateConfigValue({ name: e.target.value })}
                  placeholder="Contoh: NEXERA Assistant, Toko CS..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Prefix Perintah Bot:
                </label>
                <input
                  type="text"
                  value={botConfig.prefix}
                  onChange={(e) => updateConfigValue({ prefix: e.target.value })}
                  placeholder="Contoh: . atau !"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor Pemilik (Owner Opsional):
                </label>
                <input
                  type="text"
                  value={botConfig.ownerPhone}
                  onChange={(e) => updateConfigValue({ ownerPhone: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="Masukkan nomor owner jika ada"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Pemilihan Otak AI (ChatGPT vs Grok Rudi) */}
          <div className="rounded-3xl p-6 bg-[#040d21]/90 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">1. Pilih Otak AI Utama (Provider Resmi)</h3>
                  <p className="text-xs text-slate-400">Pilih antara OpenAI ChatGPT atau Grok AI dengan persona Rudi si Red Panda.</p>
                </div>
              </div>
            </div>

            {/* Provider Selection Tabs (2 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: ChatGPT (OpenAI) */}
              <div
                onClick={() => handleSelectProvider('chatgpt')}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  botConfig.aiProvider === 'chatgpt'
                    ? 'bg-emerald-950/70 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 uppercase">
                      Official OpenAI API
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      providerStatus.chatgpt.hasKey ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {providerStatus.chatgpt.hasKey ? '● API Key Aktif' : '○ Membutuhkan OPENAI_API_KEY'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>ChatGPT Engine</span>
                    {botConfig.aiProvider === 'chatgpt' && <span className="text-xs text-emerald-400">✓ Dipilih</span>}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Ditenagai model GPT terkemuka dari OpenAI untuk pemahaman instruksi presisi, logika mendalam, dan bahasa Indonesia alami.
                  </p>
                </div>

                {/* Model Selector for ChatGPT */}
                {botConfig.aiProvider === 'chatgpt' && (
                  <div className="mt-4 pt-3 border-t border-emerald-900/50 space-y-2 animate-in fade-in">
                    <span className="block text-[11px] font-bold text-emerald-300">Pilih Model ChatGPT:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'gpt-4o-mini', label: 'GPT-4o Mini', tag: 'Kilat & Hemat' },
                        { id: 'gpt-4o', label: 'GPT-4o', tag: 'Flagship' },
                        { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', tag: 'Classic' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            updateConfigValue({ aiModel: m.id });
                          }}
                          className={`p-2 rounded-xl text-center border text-xs cursor-pointer transition-all ${
                            botConfig.aiModel === m.id
                              ? 'bg-emerald-800 text-white border-emerald-300 font-bold shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          <p className="font-bold text-[11px] truncate">{m.label}</p>
                          <p className="text-[9px] opacity-75">{m.tag}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Option B: Grok AI - Persona Rudi (xAI) */}
              <div
                onClick={() => handleSelectProvider('grok')}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  botConfig.aiProvider === 'grok'
                    ? 'bg-amber-950/70 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 uppercase">
                      Official xAI API • Persona Rudi 🐾
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      providerStatus.grok.hasKey ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {providerStatus.grok.hasKey ? '● API Key Aktif' : '○ Membutuhkan XAI_API_KEY'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Grok AI — Persona Rudi</span>
                    {botConfig.aiProvider === 'grok' && <span className="text-xs text-amber-400">✓ Dipilih</span>}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Karakter red panda yang ramah, santai, humoris, dan pintar yang beroperasi di atas API resmi Grok xAI dengan kepribadian hidup dan cerdas.
                  </p>
                </div>

                {/* Model Selector for Grok */}
                {botConfig.aiProvider === 'grok' && (
                  <div className="mt-4 pt-3 border-t border-amber-900/50 space-y-2 animate-in fade-in">
                    <span className="block text-[11px] font-bold text-amber-300">Pilih Model Grok xAI:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'grok-beta', label: 'Grok Beta', tag: 'Cepat & Ceria' },
                        { id: 'grok-2-latest', label: 'Grok 2 Latest', tag: 'Penalaran 2.0' },
                        { id: 'grok-2', label: 'Grok 2', tag: 'Stabil' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            updateConfigValue({ aiModel: m.id });
                          }}
                          className={`p-2 rounded-xl text-center border text-xs cursor-pointer transition-all ${
                            botConfig.aiModel === m.id
                              ? 'bg-amber-700 text-white border-amber-300 font-bold shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          <p className="font-bold text-[11px] truncate">{m.label}</p>
                          <p className="text-[9px] opacity-75">{m.tag}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* API Key info banner */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div className="text-[11px] leading-relaxed">
                <span>
                  <strong>Keamanan API Key:</strong> Kunci API ({botConfig.aiProvider === 'grok' ? 'XAI_API_KEY' : 'OPENAI_API_KEY'}) tersimpan aman pada backend environment server dan tidak pernah terekspos ke frontend atau perangkat publik.
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Gaya Bicara & Persona */}
          <div className="rounded-3xl p-6 bg-[#040d21]/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-base font-bold text-white">2. Pilih Gaya Bicara (Persona Karakter)</h3>
                <p className="text-xs text-slate-400">Gaya bertutur alami, relevan, tidak kaku, dan tidak selalu mengakhiri dengan pertanyaan monoton.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {speechStyles.map((style) => {
                const isSelected = botConfig.speechStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => {
                      playClickSound();
                      updateConfigValue({ speechStyle: style.id });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-950/80 border-purple-400 text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/50'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {style.badge}
                        </span>
                        {isSelected && <span className="text-purple-400 text-xs font-bold">✓ Aktif</span>}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white mb-1">{style.label}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{style.desc}</p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[10px] text-slate-300 italic">
                      "{style.sample}"
                    </div>
                  </button>
                );
              })}
            </div>

            {botConfig.speechStyle === 'custom' && (
              <div className="pt-2 animate-in fade-in">
                <label className="block text-xs font-semibold text-purple-300 mb-1.5">
                  Tuliskan Instruksi Khusus Gaya Bicara Bot Anda:
                </label>
                <textarea
                  value={botConfig.customPrompt}
                  onChange={(e) => updateConfigValue({ customPrompt: e.target.value })}
                  rows={3}
                  placeholder="Contoh: Bicaralah dengan dialek khas Jakarta Selatan yang santai, sering gunakan istilah start-up, tapi selalu ramah dan solutif..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-purple-500/40 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>
            )}
          </div>

          {/* Card 4: Fitur Bot & Aturan Grup */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Features Selector */}
            <div className="rounded-3xl p-6 bg-[#040d21]/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">3. Pilihan Fitur Bot (Modul Aktif)</h3>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: 'aiAutoReply' as const,
                    label: 'AI Auto-Reply & Konteks Memori',
                    desc: 'Balasan otomatis percakapan cerdas dengan ingatan konteks per pengguna.',
                    icon: MessageSquare,
                    color: 'text-cyan-400',
                  },
                  {
                    key: 'customCommands' as const,
                    label: 'Custom Commands (.menu, .ping, .info)',
                    desc: 'Daftar menu perintah cepat otomatis dengan awalan prefix.',
                    icon: Terminal,
                    color: 'text-purple-400',
                  },
                  {
                    key: 'miniGames' as const,
                    label: 'Mini-Games, Kuis & Papan Skor (.tebak, .kuis, .skor)',
                    desc: 'Game tebak-tebakan logika, kuis trivia pintar, dan leaderboard top skor.',
                    icon: Gamepad2,
                    color: 'text-emerald-400',
                  },
                  {
                    key: 'stickerMaker' as const,
                    label: 'Sticker Maker (.sticker / .s)',
                    desc: 'Konversi instan foto/gambar yang dikirim menjadi stiker WhatsApp (WebP 512x512).',
                    icon: Sticker,
                    color: 'text-amber-400',
                  },
                  {
                    key: 'antiSpam' as const,
                    label: 'Anti-Spam & Pencegah Balasan Berulang',
                    desc: 'Filter laju pesan (>5 pesan/10s) dan penekanan pesan loop duplikat otomatis.',
                    icon: ShieldCheck,
                    color: 'text-blue-400',
                  },
                  {
                    key: 'ownerAdmin' as const,
                    label: 'Fitur Owner/Admin (.status, .setstatus)',
                    desc: 'Kontrol penuh pemilik nomor bot untuk memantau server & ganti status.',
                    icon: UserCheck,
                    color: 'text-rose-400',
                  },
                ].map((feat) => {
                  const isChecked = botConfig.features[feat.key];
                  const Icon = feat.icon;
                  return (
                    <div
                      key={feat.key}
                      onClick={() => {
                        playClickSound();
                        updateConfigValue({
                          features: {
                            ...botConfig.features,
                            [feat.key]: !isChecked,
                          },
                        });
                      }}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-slate-900/90 border-slate-700'
                          : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                          <Icon className={`w-4 h-4 ${feat.color}`} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{feat.label}</p>
                          <p className="text-[11px] text-slate-400">{feat.desc}</p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isChecked ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-slate-700 bg-slate-950'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group Rules & Chat Scope */}
            <div className="rounded-3xl p-6 bg-[#040d21]/90 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 mb-4">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">4. Pengaturan Respons Grup WhatsApp</h3>
                </div>

                <div className="space-y-3">
                  <span className="block text-xs font-semibold text-slate-300">
                    Mode Respons di Dalam Grup:
                  </span>
                  {groupModes.map((gm) => {
                    const isSelected = botConfig.groupMode === gm.id;
                    const Icon = gm.icon;
                    return (
                      <button
                        key={gm.id}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          updateConfigValue({ groupMode: gm.id });
                        }}
                        className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className={`p-2 rounded-xl mt-0.5 ${isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-950 text-slate-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{gm.label}</span>
                            {isSelected && <span className="text-[10px] text-emerald-400 font-normal">● Aktif</span>}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{gm.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Scope Toggles */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
                  <span className="block text-xs font-semibold text-slate-300 mb-1">
                    Cakupan Chat yang Diizinkan:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateConfigValue({ allowPrivate: !botConfig.allowPrivate })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer ${
                        botConfig.allowPrivate ? 'bg-cyan-950/60 border-cyan-400/60 text-cyan-200' : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span>Private Chat (DM)</span>
                      <span>{botConfig.allowPrivate ? '✓ Aktif' : 'Nonaktif'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateConfigValue({ allowGroup: !botConfig.allowGroup })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer ${
                        botConfig.allowGroup ? 'bg-emerald-950/60 border-emerald-400/60 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span>Grup WhatsApp</span>
                      <span>{botConfig.allowGroup ? '✓ Aktif' : 'Nonaktif'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => {
                    handleSaveConfig(false);
                    setActiveStep('connect');
                  }}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>Lanjut ke Tautan WhatsApp</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: WHATSAPP CONNECTION (Pairing Code & QR Code) */}
      {activeStep === 'connect' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-6 bg-[#040d21]/90 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Hubungkan Bot ke WhatsApp Anda</h3>
                  <p className="text-xs text-slate-300">Gunakan Pairing Code 8 digit atau scan QR Code resmi untuk menautkan perangkat.</p>
                </div>
              </div>

              {/* Reconnect / Disconnect Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReconnect}
                  disabled={isConnecting}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                  <span>Hubungkan Ulang</span>
                </button>

                <button
                  onClick={() => handleDisconnect(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Putus Sesi</span>
                </button>
              </div>
            </div>

            {/* Method Tabs: Pairing Code vs QR */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => {
                  playClickSound();
                  setConnMethodTab('pairing');
                  setPhoneError('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  connMethodTab === 'pairing'
                    ? 'bg-purple-950 border border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4 text-purple-400" />
                <span>Metode 1: Pairing Code 8-Digit (Rekomendasi HP)</span>
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  setConnMethodTab('qr');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  connMethodTab === 'qr'
                    ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>Metode 2: Scan QR Code Asli</span>
              </button>
            </div>

            {/* METHOD 1: PAIRING CODE */}
            {connMethodTab === 'pairing' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                      Nomor WhatsApp Anda Sendiri:
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={phoneInput}
                          onChange={(e) => {
                            setPhoneInput(e.target.value);
                            if (phoneError) setPhoneError('');
                          }}
                          placeholder="Masukkan nomor WhatsApp dengan kode negara (contoh: 628xxxxxxxxxx)"
                          className={`flex-1 px-4 py-3 rounded-2xl bg-slate-900 border text-white font-mono text-xs sm:text-sm focus:outline-none ${
                            phoneError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-purple-400'
                          }`}
                        />
                        <button
                          onClick={handleConnectPairing}
                          disabled={isConnecting || !phoneInput.trim()}
                          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center gap-2 disabled:opacity-40"
                        >
                          {isConnecting ? (
                            <>
                              <RotateCcw className="w-4 h-4 animate-spin" />
                              <span>Memproses...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              <span>Buat Pairing Code</span>
                            </>
                          )}
                        </button>
                      </div>

                      {phoneError && (
                        <p className="text-xs text-rose-400 flex items-center gap-1.5 font-medium animate-in fade-in">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{phoneError}</span>
                        </p>
                      )}

                      {/* Reset / Cancel Button */}
                      {(phoneInput || pairingCode) && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={handleResetPairingForm}
                            className="text-xs text-slate-400 hover:text-rose-300 underline cursor-pointer"
                          >
                            Reset / Kosongkan Kolom Nomor
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5 Step Tutorial for Pairing Code */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-purple-400" />
                      <span>Cara Memasukkan Pairing Code di HP Anda:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                      <li>Buka aplikasi WhatsApp di HP Anda.</li>
                      <li>Ketuk ikon titik tiga (Android) atau menu Pengaturan (iPhone).</li>
                      <li>Pilih menu <strong>Perangkat Tertaut</strong> (Linked Devices).</li>
                      <li>Ketuk <strong>Tautkan Perangkat</strong>, lalu pilih <strong>Tautkan dengan Kode</strong> di bagian bawah layar.</li>
                      <li>Ketikkan 8 digit kode pairing yang muncul di samping!</li>
                    </ol>
                  </div>
                </div>

                {/* Pairing Code Display Box */}
                <div className="p-6 rounded-3xl bg-gradient-to-b from-purple-950/40 to-slate-950 border border-purple-500/40 text-center flex flex-col items-center justify-center min-h-[220px]">
                  {pairingCode ? (
                    <div className="space-y-4 animate-in fade-in">
                      <span className="text-[11px] font-bold tracking-wider text-purple-300 uppercase">
                        Kode Pairing WhatsApp Resmi
                      </span>
                      <div className="px-6 py-3 rounded-2xl bg-slate-950 border-2 border-purple-400 font-mono text-2xl sm:text-3xl font-black text-white tracking-[0.25em] shadow-[0_0_25px_rgba(168,85,247,0.4)]">
                        {pairingCode}
                      </div>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={copyPairingCode}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
                        >
                          {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-emerald-400 animate-pulse font-semibold">
                        ● Menunggu input kode di aplikasi WhatsApp Anda...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-slate-300 font-semibold">
                        Pairing Code Belum Diminta
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                        Masukkan nomor WhatsApp milik Anda sendiri di sebelah kiri lalu klik tombol "Buat Pairing Code".
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* METHOD 2: REAL QR CODE WITH 60s AUTO-REFRESH */}
            {connMethodTab === 'qr' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-cyan-400" />
                      <span>Cara Memindai QR Code WhatsApp:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                      <li>Buka aplikasi WhatsApp di HP Anda.</li>
                      <li>Pilih menu <strong>Perangkat Tertaut</strong> (Linked Devices).</li>
                      <li>Ketuk <strong>Tautkan Perangkat</strong>.</li>
                      <li>Arahkan kamera HP Anda ke QR Code di samping kanan.</li>
                    </ol>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleConnectQr}
                      disabled={isConnecting}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      {isConnecting ? (
                        <>
                          <RotateCcw className="w-4 h-4 animate-spin" />
                          <span>Menghubungkan Sesi QR...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          <span>Mulai Sesi QR Code</span>
                        </>
                      )}
                    </button>

                    {qrCodeDataUrl && (
                      <button
                        onClick={() => handleRefreshQr(true)}
                        disabled={isRefreshingQr}
                        className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQr ? 'animate-spin' : ''}`} />
                        <span>Perbarui QR</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* QR Code Container with Auto-Refresh Timer */}
                <div className="p-6 rounded-3xl bg-slate-950 border border-cyan-500/40 text-center flex flex-col items-center justify-center min-h-[260px]">
                  {qrCodeDataUrl ? (
                    <div className="space-y-3 animate-in fade-in">
                      <div className="p-3 bg-white rounded-2xl inline-block shadow-xl">
                        <img src={qrCodeDataUrl} alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
                      </div>
                      
                      {/* Auto-Refresh Timer Indicator */}
                      <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-300">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Auto-Refresh QR dalam: <strong className="text-white">{qrSecondsLeft}s</strong></span>
                      </div>

                      <p className="text-[11px] text-cyan-300 font-semibold animate-pulse">
                        ● Pindai QR Code di atas melalui WhatsApp di ponsel Anda
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-slate-300 font-semibold">QR Code Belum Diminta</p>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Klik tombol "Mulai Sesi QR Code" untuk menampilkan kode QR otentik Baileys.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: SANDBOX TEST SIMULATOR & LOGS */}
      {activeStep === 'test' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Interactive WhatsApp Phone Mockup */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950 flex flex-col h-[520px] overflow-hidden shadow-2xl">
              {/* WhatsApp Mock Header */}
              <div className="p-3.5 bg-emerald-950/90 border-b border-emerald-900/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/30 border border-emerald-400 text-emerald-300 flex items-center justify-center font-bold text-xs">
                    {botConfig.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                      <span>{botConfig.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[9px] text-emerald-300 uppercase">
                        {botConfig.aiProvider === 'grok' ? 'Grok Rudi' : botConfig.aiModel}
                      </span>
                    </p>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{simIsGroup ? 'Uji Mode Grup' : 'Uji Mode Private Chat'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSimIsGroup(!simIsGroup)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      simIsGroup
                        ? 'bg-purple-950 border-purple-400 text-purple-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {simIsGroup ? 'Grup Mode: ON' : 'Private Mode: ON'}
                  </button>

                  <button
                    onClick={() => setSimChat([])}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px]"
                    title="Bersihkan Chat"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-[#071318]/50">
                {simChat.map((chat, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${chat.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-md whitespace-pre-wrap ${
                        chat.sender === 'user'
                          ? 'bg-emerald-700 text-white rounded-tr-none'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {chat.text}
                      <span className="block text-[9px] text-slate-400 text-right mt-1">
                        {chat.time}
                      </span>
                    </div>
                  </div>
                ))}
                {isSendingTest && (
                  <div className="flex items-start">
                    <div className="rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-400 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>{botConfig.name} ({botConfig.aiProvider === 'grok' ? 'Rudi' : 'ChatGPT'}) sedang mengetik...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Preset Command Chips */}
              <div className="p-2 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                {['.menu', '.ping', '.tebak', '.kuis', '.skor', '.info', 'Halo bot!'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendTestMessage(undefined, chip)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[10px] whitespace-nowrap cursor-pointer transition-all border border-slate-700/60"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendTestMessage} className="p-2.5 bg-slate-900 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  placeholder={`Ketik pesan uji coba (contoh: .menu atau tanya AI)...`}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="submit"
                  disabled={!simMessage.trim() || isSendingTest}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Right: Server Live Logs & Leaderboard */}
            <div className="space-y-4">
              {/* Leaderboard Card if games active */}
              {botConfig.features.miniGames && leaderboard.length > 0 && (
                <div className="p-4 rounded-3xl bg-[#040d21]/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Award className="w-4 h-4" />
                    <span>Top Leaderboard Skor Game</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {leaderboard.slice(0, 4).map((p, i) => (
                      <div key={i} className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                        <span className="font-bold text-white truncate">{i + 1}. {p.name}</span>
                        <span className="text-amber-400 font-bold">{p.score} Poin</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Console Logs */}
              <div className="rounded-3xl border border-slate-800 bg-[#020510] p-4 flex flex-col h-[400px] overflow-hidden font-mono text-xs shadow-xl">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Terminal className="w-4 h-4" />
                    <span>Live Baileys, ChatGPT & Grok Console</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">Node.js Engine Active</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pt-3 pr-1">
                  {logs.map((log, i) => (
                    <div key={i} className="leading-tight text-[11px]">
                      <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                      <span
                        className={
                          log.level === 'SUCCESS'
                            ? 'text-emerald-400 font-bold'
                            : log.level === 'AUTH'
                            ? 'text-purple-400 font-bold'
                            : log.level === 'REPLY'
                            ? 'text-cyan-400'
                            : log.level === 'RECV'
                            ? 'text-amber-400'
                            : log.level === 'WARN'
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }
                      >
                        [{log.level}]
                      </span>{' '}
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: EXPORT CODE & SCRIPT EDITOR */}
      {activeStep === 'code' && (
        <div className="rounded-3xl bg-[#040d21]/90 border border-slate-800 shadow-xl overflow-hidden space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto">
              {(['index.js', 'package.json', '.env.example', 'README.md'] as const).map((file) => (
                <button
                  key={file}
                  onClick={() => {
                    playClickSound();
                    setActiveFile(file);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeFile === file
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-transparent'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{file}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playClickSound();
                  navigator.clipboard.writeText(generatedFiles[activeFile]);
                  setCopiedFile(true);
                  setTimeout(() => setCopiedFile(false), 2000);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copiedFile ? 'Tersalin' : 'Salin File'}</span>
              </button>

              <button
                onClick={downloadZip}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Proyek (.ZIP)</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#020510]">
            <div className="p-2.5 bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>{activeFile} • Dihasilkan otomatis ({botConfig.aiProvider.toUpperCase()} - {botConfig.aiModel})</span>
              <span className="text-cyan-400 font-bold">Node.js ES Modules</span>
            </div>
            <textarea
              readOnly
              value={generatedFiles[activeFile]}
              rows={18}
              className="w-full p-4 font-mono text-xs sm:text-sm text-cyan-200 bg-transparent focus:outline-none resize-none leading-relaxed selection:bg-cyan-500/30"
            />
          </div>
        </div>
      )}
    </div>
  );
};
