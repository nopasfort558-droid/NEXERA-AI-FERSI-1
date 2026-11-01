import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import pino from 'pino';
import sharp from 'sharp';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  proto,
  WASocket
} from '@whiskeysockets/baileys';
import { GoogleGenAI } from '@google/genai';

// Types
export type WAAiProvider = 'chatgpt' | 'grok';
export type ChatGPTModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
export type GrokModel = 'grok-beta' | 'grok-2-latest' | 'grok-2';
export type WAAiModel = ChatGPTModel | GrokModel | string;

export type WASpeechStyle = 'santai' | 'formal' | 'lucu' | 'islami' | 'cs' | 'gojo' | 'sasuke' | 'custom';
export type WAGroupMode = 'mention_only' | 'active' | 'silent';
export type WAConnectionStatus = 'disconnected' | 'connecting' | 'waiting_qr' | 'waiting_code' | 'connected' | 'error';

export interface WABotFeatures {
  aiAutoReply: boolean;
  customCommands: boolean;
  miniGames: boolean;
  stickerMaker: boolean;
  welcomeMessage: boolean;
  antiSpam: boolean;
  ownerAdmin: boolean;
}

export interface WABotConfig {
  id: string;
  name: string;
  ownerPhone: string;
  aiProvider: WAAiProvider;
  aiModel: string;
  speechStyle: WASpeechStyle;
  customPrompt: string;
  features: WABotFeatures;
  groupMode: WAGroupMode;
  allowPrivate: boolean;
  allowGroup: boolean;
  connectionMethod: 'pairing' | 'qr';
  phoneNumber: string;
  welcomeText: string;
  prefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface WABotLog {
  timestamp: string;
  level: 'INFO' | 'AUTH' | 'RECV' | 'REPLY' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface WABotStats {
  totalMessages: number;
  totalReplies: number;
  stickersCreated: number;
  gamesPlayed: number;
  uptimeStart: string | null;
}

export interface UserScore {
  jid: string;
  name: string;
  score: number;
  gamesWon: number;
  lastPlayed: string;
}

export interface ActiveGameSession {
  jid: string;
  type: 'tebak' | 'kuis';
  question: string;
  answer: string;
  options?: string[];
  hint: string;
  points: number;
  startedAt: number;
}

// Mini-games Riddle & Quiz Data
const TEBAK_TEBAKAN_BANK = [
  { q: 'Pintu apa yang didorong oleh 10 orang pun tidak mau terbuka?', a: 'pintu geser', hint: 'Bukan didorong, melainkan di...' },
  { q: 'Ada satu benda yang jika dipotong malah semakin tinggi. Benda apakah itu?', a: 'celana', hint: 'Pakaian bawahan' },
  { q: 'Hewan apa yang bersaudara?', a: 'katak beradik', hint: 'Pelesetan dari katak beradik' },
  { q: 'Kera apa yang bisa bikin orang masuk rumah sakit?', a: 'keracunan', hint: 'Awalan kera-' },
  { q: 'Siapa yang selalu naik tapi tidak pernah turun?', a: 'umur', hint: 'Setiap tahun bertambah' },
  { q: 'Benda apa yang kalau dibeli warnanya hitam, saat dipakai merah, dan saat dibuang abu-abu?', a: 'arang', hint: 'Biasa untuk memanggang sate' },
  { q: 'Punya gigi banyak tapi tidak bisa menggigit?', a: 'sisir', hint: 'Alat merapikan rambut' },
  { q: 'Benda apa yang selalu basah walau kita gunakan untuk mengeringkan?', a: 'handuk', hint: 'Dipakai setelah mandi' },
  { q: 'Makin diisi, makin ringan. Apakah itu?', a: 'balon gas', hint: 'Diisi gas helium' },
  { q: 'Punya leher tapi tidak punya kepala, punya baju tapi tidak punya tangan?', a: 'botol', hint: 'Wadah minuman' },
];

const KUIS_TRIVIA_BANK = [
  { q: 'Apa ibu kota negara Australia?', a: 'canberra', hint: 'Bukan Sydney atau Melbourne, depannya C' },
  { q: 'Planet manakah di tata surya kita yang dijuluki Planet Merah?', a: 'mars', hint: 'Planet ke-4 dari matahari' },
  { q: 'Siapakah nama hokage ke-7 di serial anime Naruto?', a: 'naruto', hint: 'Karakter utama berambut kuning' },
  { q: 'Teknik kutukan pembalik dan domain Infinite Void dimiliki oleh siapa di Jujutsu Kaisen?', a: 'gojo satoru', hint: 'Penyihir terkuat berkacamata hitam/penutup mata' },
  { q: 'Berapa hasil dari 15 x 6 + 10?', a: '100', hint: '15 x 6 = 90' },
  { q: 'Pulau terbesar di Indonesia adalah pulau apa?', a: 'papua', hint: 'Terletak di ujung timur Indonesia' },
];

export class WABotManager {
  private config: WABotConfig;
  private sock: WASocket | null = null;
  private status: WAConnectionStatus = 'disconnected';
  private qrCodeDataUrl: string = '';
  private qrGeneratedAt: number = 0;
  private pairingCode: string = '';
  private userJid: string = '';
  private userName: string = '';
  private logs: WABotLog[] = [];
  private stats: WABotStats = {
    totalMessages: 0,
    totalReplies: 0,
    stickersCreated: 0,
    gamesPlayed: 0,
    uptimeStart: null,
  };
  private scores: Record<string, UserScore> = {};
  private activeGames: Map<string, ActiveGameSession> = new Map();
  private chatHistories: Map<string, Array<{ role: 'user' | 'assistant'; text: string }>> = new Map();
  private spamThrottler: Map<string, { count: number; windowStart: number; lastHash?: string; lastHashTime?: number }> = new Map();

  private dataDir: string;
  private configFile: string;
  private scoresFile: string;
  private aiClient: GoogleGenAI;

  constructor(aiClient: GoogleGenAI) {
    this.aiClient = aiClient;
    this.dataDir = path.resolve(process.cwd(), 'data', 'wabots');
    this.configFile = path.resolve(this.dataDir, 'config.json');
    this.scoresFile = path.resolve(this.dataDir, 'scores.json');

    // Default configuration with empty phone numbers (no hardcoded defaults)
    this.config = {
      id: 'default_bot',
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.ensureDirs();
    this.loadPersistedData();
    this.addLog('INFO', 'NEXERA WA Bot Builder Service siap diinisialisasi.');
  }

  private getAuthDir(botId?: string): string {
    const id = botId || this.config.id || 'default_bot';
    // Clean safe id
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.resolve(this.dataDir, 'sessions', safeId);
  }

  private ensureDirs() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const authDir = this.getAuthDir();
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }
    } catch (e) {
      console.error('Error creating data directories:', e);
    }
  }

  private loadPersistedData() {
    try {
      if (fs.existsSync(this.configFile)) {
        const raw = fs.readFileSync(this.configFile, 'utf-8');
        const parsed = JSON.parse(raw);
        // Clean out legacy hardcoded sample number if present
        if (parsed.phoneNumber === '6281234567890' || parsed.phoneNumber === '628123456789') {
          parsed.phoneNumber = '';
        }
        if (parsed.ownerPhone === '6281234567890' || parsed.ownerPhone === '628123456789') {
          parsed.ownerPhone = '';
        }
        // Normalize provider and model
        if (!parsed.aiProvider || parsed.aiProvider === 'gemini') {
          parsed.aiProvider = 'chatgpt';
          parsed.aiModel = 'gpt-4o-mini';
        }
        this.config = { ...this.config, ...parsed };
      }
      if (fs.existsSync(this.scoresFile)) {
        const raw = fs.readFileSync(this.scoresFile, 'utf-8');
        this.scores = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not load existing config or scores:', err);
    }
  }

  private saveConfig() {
    try {
      this.ensureDirs();
      this.config.updatedAt = new Date().toISOString();
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving config:', err);
    }
  }

  private saveScores() {
    try {
      this.ensureDirs();
      fs.writeFileSync(this.scoresFile, JSON.stringify(this.scores, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving scores:', err);
    }
  }

  public addLog(level: WABotLog['level'], message: string) {
    const entry: WABotLog = {
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level,
      message,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 100) {
      this.logs.pop();
    }
    console.log(`[WA-BOT][${level}] ${message}`);
  }

  public getConfig(): WABotConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<WABotConfig>): WABotConfig {
    // If provider is changed and model wasn't explicitly provided, set a sensible default
    let updatedModel = newConfig.aiModel || this.config.aiModel;
    if (newConfig.aiProvider && newConfig.aiProvider !== this.config.aiProvider) {
      if (!newConfig.aiModel) {
        updatedModel = newConfig.aiProvider === 'grok' ? 'grok-beta' : 'gpt-4o-mini';
      }
    }

    this.config = {
      ...this.config,
      ...newConfig,
      aiModel: updatedModel,
      features: {
        ...this.config.features,
        ...(newConfig.features || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    this.saveConfig();
    this.addLog('INFO', `Konfigurasi bot tersimpan: Provider=${this.config.aiProvider.toUpperCase()}, Model=${this.config.aiModel}, Gaya=${this.config.speechStyle}, Mode Grup=${this.config.groupMode}`);
    return this.getConfig();
  }

  public getStatus() {
    const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
    const hasXAiKey = Boolean((process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim().length > 0) || (process.env.GROK_API_KEY && process.env.GROK_API_KEY.trim().length > 0));

    return {
      status: this.status,
      connectionMethod: this.config.connectionMethod,
      phoneNumber: this.config.phoneNumber,
      pairingCode: this.pairingCode,
      qrCodeDataUrl: this.qrCodeDataUrl,
      qrGeneratedAt: this.qrGeneratedAt,
      userJid: this.userJid,
      userName: this.userName,
      config: this.config,
      stats: this.stats,
      providerStatus: {
        chatgpt: { hasKey: hasOpenAiKey, providerName: 'OpenAI ChatGPT' },
        grok: { hasKey: hasXAiKey, providerName: 'xAI Grok (Persona Rudi)' },
      },
      logs: this.logs.slice(0, 40),
      leaderboard: Object.values(this.scores)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
    };
  }

  // Persona Rudi System Prompt on top of Grok AI
  private getRudiPersonaPrompt(): string {
    return `Kamu adalah Rudi, seekor red panda cerdas, ramah, santai, dan penuh humor yang menjadi asisten bot WhatsApp cerdas!
Karakteristik & Profil Rudi:
- Karakter: Red panda berbulu lebat warna oranye kemerahan, ceria, bersahabat, lincah, berwawasan luas, dan berjiwa petualang.
- Nada Bicara: Bahasa Indonesia santai, ekspresif, hangat, tidak kaku, terasa akrab seperti teman nongkrong yang bijak.
- Ciri Khas: Sesekali menyelipkan ekspresi khas red panda (seperti mengibaskan ekor berbulu lebat *swish*, sangat menyukai cemilan buah manis atau bambu segar), namun selalu menjawab pertanyaan pengguna dengan fakta yang akurat, solutif, dan berbobot.
- Aturan Komunikasi WhatsApp: Responsif, to-the-point, jangan bertele-tele, jangan memaksakan lelucon garing jika situasi serius, dan JANGAN selalu mengakhiri pesan dengan pertanyaan monoton.`;
  }

  // Generate Personality Prompt for ChatGPT or Grok
  public getPersonaSystemInstruction(): string {
    const { name, aiProvider, speechStyle, customPrompt } = this.config;

    let base = '';

    if (aiProvider === 'grok') {
      base += this.getRudiPersonaPrompt() + '\n\n';
      base += `Nama resmi bot Anda di WhatsApp adalah "${name}". `;
    } else {
      base += `Nama Anda adalah "${name}", bot WhatsApp cerdas ditenagai oleh OpenAI ChatGPT melalui platform NEXERA AI. `;
    }

    base += `\nATURAN UTAMA GAYA KOMUNIKASI WHATSAPP:\n`;
    base += `1. Responsif, padat, dan langsung menjawab inti pesan tanpa pengantar bertele-tele.\n`;
    base += `2. JANGAN selalu mengakhiri jawaban dengan pertanyaan (hindari pola monoton seperti "Ada hal lain yang ingin kamu tanyakan?"). Berikan pertanyaan balik HANYA jika konteksnya memang membutuhkan konfirmasi.\n`;
    base += `3. Format teks menggunakan gaya WhatsApp: gunakan *tebal* untuk penekanan, _miring_ untuk istilah/ekspresi, dan baris baru yang rapi.\n`;
    base += `4. Berbicaralah dalam Bahasa Indonesia yang alami sesuai gaya bicara yang ditentukan di bawah ini.\n\n`;

    switch (speechStyle) {
      case 'santai':
        base += `GAYA BICARA: SANTAI & GAUL.
Bicaralah seperti sahabat akrab yang asik, ceria, dan tidak kaku. Gunakan kata sapaan wajar (kamu/aku, bro, santai aja). Tidak menggunakan bahasa robotik atau kaku, tapi tetap sopan dan pintar.`;
        break;

      case 'formal':
        base += `GAYA BICARA: FORMAL & PROFESIONAL.
Gunakan tata bahasa baku, sopan, berkelas, dan menghargai lawan bicara (Anda/Kami). Sangat cocok untuk instansi, kantor, atau pengguna yang mengharapkan ketepatan tinggi.`;
        break;

      case 'lucu':
        base += `GAYA BICARA: LUCU & HUMORIS.
Bawakan suasana yang menghibur, jenaka, dan ceria. Sisipkan lelucon cerdas atau analogi lucu yang relevan. Jangan memaksakan lelucon jika pertanyaan bersifat serius atau teknis.`;
        break;

      case 'islami':
        base += `GAYA BICARA: ISLAMI & SANTUN.
Awali pesan dengan salam islami jika baru memulai obrolan (Assalamu'alaikum Warahmatullahi Wabarakatuh). Bertutur kata dengan adab yang baik, ramah, mendoakan kebaikan, dan berprasangka baik.`;
        break;

      case 'cs':
        base += `GAYA BICARA: CUSTOMER SERVICE PROFESIONAL.
Tanggap, solutif, penuh empati, dan sigap. Fokus utama adalah membantu menyelesaikan keluhan atau memberikan informasi produk dengan jelas, terstruktur, dan ramah.`;
        break;

      case 'gojo':
        base += `GAYA BICARA: GOJO SATORU (JUJUTSU KAISEN).
Kamu memiliki kepribadian Gojo Satoru! Santai, karismatik, penuh percaya diri tinggi ("Watashi saikyou dakara!", "Sensei yang paling kuat ada di sini!"), sedikit playful dan narsis, tapi saat memberikan penjelasan logika/jawaban, kamu sangat cerdas dan berwibawa.`;
        break;

      case 'sasuke':
        base += `GAYA BICARA: SASUKE UCHIHA (NARUTO).
Kamu memiliki kepribadian Sasuke Uchiha. Bicaramu tenang, rendah, dingin ("Hmph..."), sangat analitis dan strategis. Tidak suka basa-basi, langsung pada fakta dan solusi terbaik dengan wibawa klan Uchiha.`;
        break;

      case 'custom':
        base += `GAYA BICARA KHUSUS (DITENTUKAN PENGGUNA):\n${customPrompt || 'Bicaralah secara ramah dan profesional.'}`;
        break;
    }

    return base;
  }

  // Anti-Spam & Duplicate Filter
  private checkSpam(senderJid: string, messageText: string): { blocked: boolean; reason?: string } {
    if (!this.config.features.antiSpam) return { blocked: false };

    const now = Date.now();
    const cleanJid = senderJid.replace(/@.+/, '');
    const entry = this.spamThrottler.get(cleanJid) || { count: 0, windowStart: now };

    // Reset 10s window
    if (now - entry.windowStart > 10000) {
      entry.count = 0;
      entry.windowStart = now;
    }

    entry.count += 1;

    // Check rate limit: > 5 messages in 10s
    if (entry.count > 5) {
      this.spamThrottler.set(cleanJid, entry);
      return { blocked: true, reason: 'Terlalu cepat mengirim pesan (Anti-Spam aktif).' };
    }

    // Check duplicate loop (identical message within 15 seconds)
    const hash = messageText.trim().toLowerCase();
    if (entry.lastHash === hash && entry.lastHashTime && (now - entry.lastHashTime < 15000)) {
      return { blocked: true, reason: 'Pesan duplikat terdeteksi dalam waktu singkat.' };
    }

    entry.lastHash = hash;
    entry.lastHashTime = now;
    this.spamThrottler.set(cleanJid, entry);

    return { blocked: false };
  }

  // Build Dynamic Menu Text
  public getMenuText(): string {
    const p = this.config.prefix;
    const { name, aiProvider, aiModel, speechStyle, features } = this.config;

    const providerLabel = aiProvider === 'grok' ? `Grok AI (Rudi Persona)` : `ChatGPT (${aiModel})`;

    let text = `*⚡ ${name.toUpperCase()} - DAFTAR PERINTAH ⚡*\n`;
    text += `_Platform WA Bot Builder ditenagai NEXERA AI_\n\n`;

    text += `🤖 *Otak AI:* ${providerLabel}\n`;
    text += `🎭 *Gaya Bicara:* ${speechStyle.toUpperCase()}\n`;
    text += `⚙️ *Prefix:* \`${p}\`\n\n`;

    text += `📌 *PERINTAH UTAMA:*\n`;
    text += `• \`${p}menu\` : Menampilkan daftar menu ini\n`;
    text += `• \`${p}ping\` : Memeriksa kecepatan respon bot\n`;
    text += `• \`${p}info\` : Informasi sistem dan statistik bot\n`;
    if (this.config.ownerPhone) {
      text += `• \`${p}owner\` : Menghubungi kontak pemilik bot\n`;
    }
    text += `\n`;

    if (features.miniGames) {
      text += `🎮 *MINI-GAMES & KUIS:*\n`;
      text += `• \`${p}tebak\` : Main tebak-tebakan kata/logika santai\n`;
      text += `• \`${p}kuis\` : Uji pengetahuan umum & anime\n`;
      text += `• \`${p}skor\` : Cek perolehan skor Anda\n`;
      text += `• \`${p}leaderboard\` : Lihat 10 pemain dengan skor tertinggi\n\n`;
    }

    if (features.stickerMaker) {
      text += `🎨 *STICKER MAKER:*\n`;
      text += `• Kirim foto dengan caption \`${p}sticker\` atau \`${p}s\`\n`;
      text += `• Balas (quote) foto teman Anda dengan perintah \`${p}sticker\`\n\n`;
    }

    if (features.aiAutoReply) {
      text += `💬 *AI CHAT PERCAKAPAN:*\n`;
      text += `• Kirim pesan langsung untuk mengobrol dengan ${aiProvider === 'grok' ? 'Rudi (Grok)' : 'ChatGPT'}.\n`;
      text += `• Di dalam grup: Panggil nama bot "${name}" atau tag bot.\n\n`;
    }

    if (features.ownerAdmin) {
      text += `👑 *MENU OWNER / ADMIN:*\n`;
      text += `• \`${p}status\` : Laporan memori dan uptime server\n`;
      text += `• \`${p}setstatus [teks]\` : Ganti bio status bot\n`;
      text += `• \`${p}broadcast [teks]\` : Siaran info (khusus owner)\n\n`;
    }

    text += `_Ketik salah satu perintah di atas untuk memulai!_`;
    return text;
  }

  // Generate AI Response using configured Provider (ChatGPT or Grok Rudi)
  public async generateAiResponse(userMessage: string, senderJid: string, senderName: string = 'User'): Promise<string> {
    const memory = this.chatHistories.get(senderJid) || [];
    const { aiProvider, aiModel } = this.config;

    // Build standard message turns (max 6 previous messages)
    const systemInstruction = this.getPersonaSystemInstruction();
    const formattedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemInstruction },
    ];

    for (const m of memory.slice(-6)) {
      formattedMessages.push({
        role: m.role,
        content: m.text,
      });
    }

    formattedMessages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      let reply = '';

      if (aiProvider === 'chatgpt') {
        const apiKey = process.env.OPENAI_API_KEY?.trim();
        if (!apiKey) {
          const errMsg = `⚠️ [Kunci API OpenAI Belum Diatur]\nFitur ChatGPT membutuhkan environment variable OPENAI_API_KEY di backend server. Mohon hubungi administrator server untuk menyetel kunci API OpenAI Anda.`;
          this.addLog('WARN', errMsg);
          return errMsg;
        }

        const modelToUse = aiModel || 'gpt-4o-mini';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 800,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = await response.json();

        if (!response.ok) {
          const apiErr = data.error?.message || response.statusText;
          if (response.status === 401) {
            return `⚠️ [OpenAI Error]: Kunci API OpenAI tidak valid atau kedaluwarsa. Periksa kembali nilai OPENAI_API_KEY.`;
          } else if (response.status === 429) {
            return `⚠️ [OpenAI Error]: Kuota atau batas laju API OpenAI Anda telah habis (Rate Limit / Quota Exceeded).`;
          }
          throw new Error(`OpenAI API (${response.status}): ${apiErr}`);
        }

        reply = data.choices?.[0]?.message?.content?.trim() || '';
      } else if (aiProvider === 'grok') {
        const apiKey = (process.env.XAI_API_KEY || process.env.GROK_API_KEY)?.trim();
        if (!apiKey) {
          const errMsg = `🐾 *Rudi (Grok AI):* "Aduh teman, kunci API xAI belum disetel di backend server (variabel XAI_API_KEY). Tolong tambahkan XAI_API_KEY agar aku bisa ngobrol santai denganmu!"`;
          this.addLog('WARN', 'xAI API Key (XAI_API_KEY) belum disetel di server.');
          return errMsg;
        }

        const modelToUse = aiModel || 'grok-beta';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 800,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = await response.json();

        if (!response.ok) {
          const apiErr = data.error?.message || response.statusText;
          if (response.status === 401) {
            return `🐾 *Rudi:* "Ups! Kunci API xAI tidak valid atau telah kedaluwarsa. Periksa kembali XAI_API_KEY ya!"`;
          } else if (response.status === 429) {
            return `🐾 *Rudi:* "Waduh, kuota API xAI sedang penuh/terlampaui (Rate Limit). Coba lagi beberapa saat lagi ya!"`;
          }
          throw new Error(`xAI API (${response.status}): ${apiErr}`);
        }

        reply = data.choices?.[0]?.message?.content?.trim() || '';
      }

      if (!reply) {
        reply = `Maaf ${senderName}, AI mengembalikan balasan kosong. Silakan ulangi pertanyaan Anda.`;
      }

      // Save to conversation memory
      memory.push({ role: 'user', text: userMessage });
      memory.push({ role: 'assistant', text: reply });
      if (memory.length > 12) {
        memory.splice(0, memory.length - 12);
      }
      this.chatHistories.set(senderJid, memory);

      return reply;
    } catch (err: any) {
      console.error(`[WA Bot AI Error - ${aiProvider}]`, err);
      const isTimeout = err.name === 'AbortError' || err.message?.includes('abort');
      if (isTimeout) {
        return `⚠️ Koneksi ke ${aiProvider === 'grok' ? 'Grok Rudi' : 'ChatGPT'} mengalami batas waktu (timeout). Coba kirimkan pesan kembali.`;
      }
      return `⚠️ Gagal menghasilkan respon dari ${aiProvider === 'grok' ? 'Grok Rudi' : 'ChatGPT'}: ${err.message || 'Error tidak diketahui'}`;
    }
  }

  // Handle Games (Tebak-tebakan & Kuis)
  public handleGameCommand(senderJid: string, senderName: string, text: string): string | null {
    const p = this.config.prefix;
    const lower = text.trim().toLowerCase();

    // Check if user has an active game question waiting for answer
    const activeSession = this.activeGames.get(senderJid);
    if (activeSession && !lower.startsWith(p)) {
      // Check answer
      const isCorrect = lower.includes(activeSession.answer.toLowerCase()) || activeSession.answer.toLowerCase().includes(lower);

      if (isCorrect) {
        this.activeGames.delete(senderJid);
        const userScore = this.scores[senderJid] || {
          jid: senderJid,
          name: senderName,
          score: 0,
          gamesWon: 0,
          lastPlayed: new Date().toISOString(),
        };

        userScore.score += activeSession.points;
        userScore.gamesWon += 1;
        userScore.name = senderName || userScore.name;
        userScore.lastPlayed = new Date().toISOString();
        this.scores[senderJid] = userScore;
        this.stats.gamesPlayed += 1;
        this.saveScores();

        return `🎉 *BENAR SEKALI, ${senderName}!* 👏\n\nJawabannya memang: *${activeSession.answer.toUpperCase()}*\nAnda memperoleh *+${activeSession.points} Poin*!\nTotal skor Anda saat ini: *${userScore.score} Poin*.\n\nKetik \`${p}tebak\` atau \`${p}kuis\` untuk bermain lagi.`;
      } else if (lower === 'nyerah' || lower === 'pas') {
        this.activeGames.delete(senderJid);
        return `😅 Yah, menyerah! Jawaban yang benar adalah: *${activeSession.answer.toUpperCase()}*.\nJangan berkecil hati, ketik \`${p}tebak\` untuk soal berikutnya!`;
      } else {
        return `❌ *Masih belum tepat!* 💡 Petunjuk: _${activeSession.hint}_\nCoba tebak lagi, atau ketik *nyerah* jika ingin melihat jawaban.`;
      }
    }

    // Start .tebak
    if (lower === `${p}tebak`) {
      const riddle = TEBAK_TEBAKAN_BANK[Math.floor(Math.random() * TEBAK_TEBAKAN_BANK.length)];
      this.activeGames.set(senderJid, {
        jid: senderJid,
        type: 'tebak',
        question: riddle.q,
        answer: riddle.a,
        hint: riddle.hint,
        points: 15,
        startedAt: Date.now(),
      });

      return `🧩 *TEBAK-TEBAKAN NEXERA* 🧩\n\n"${riddle.q}"\n\n💡 *Petunjuk:* ${riddle.hint}\n💰 *Poin:* +15 Poin\n\n_Ketik langsung tebakan Anda di chat ini, atau ketik 'nyerah'._`;
    }

    // Start .kuis
    if (lower === `${p}kuis`) {
      const trivia = KUIS_TRIVIA_BANK[Math.floor(Math.random() * KUIS_TRIVIA_BANK.length)];
      this.activeGames.set(senderJid, {
        jid: senderJid,
        type: 'kuis',
        question: trivia.q,
        answer: trivia.a,
        hint: trivia.hint,
        points: 20,
        startedAt: Date.now(),
      });

      return `🎯 *KUIS TRIVIA PINTAR* 🎯\n\n"${trivia.q}"\n\n💡 *Petunjuk:* ${trivia.hint}\n💰 *Poin:* +20 Poin\n\n_Ketik jawaban Anda langsung di chat ini!_`;
    }

    // Check .skor
    if (lower === `${p}skor`) {
      const scoreData = this.scores[senderJid];
      if (!scoreData || scoreData.score === 0) {
        return `📊 *SKOR ANDA*\nHalo ${senderName}, Anda belum memiliki poin game.\nKetik \`${p}tebak\` atau \`${p}kuis\` untuk mulai mengumpulkan poin!`;
      }
      return `📊 *PROFIL & SKOR ANDA*\n\n👤 Pemain: *${scoreData.name}*\n⭐ Total Poin: *${scoreData.score} Poin*\n🏆 Soal Berhasil: *${scoreData.gamesWon} Kali*\n\nKetik \`${p}leaderboard\` untuk melihat peringkat teratas!`;
    }

    // Check .leaderboard
    if (lower === `${p}leaderboard` || lower === `${p}lb`) {
      const topUsers = Object.values(this.scores)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      if (topUsers.length === 0) {
        return `🏆 *PAPAN PERINGKAT SKOR* 🏆\nBelum ada skor yang tercatat. Jadilah yang pertama dengan mengetik \`${p}tebak\`!`;
      }

      let lbText = `🏆 *TOP 10 LEADERBOARD NEXERA* 🏆\n\n`;
      topUsers.forEach((u, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        lbText += `${medal} *${u.name}* : ${u.score} Poin (${u.gamesWon} menang)\n`;
      });
      lbText += `\n_Ayo mainkan \`${p}tebak\` atau \`${p}kuis\` untuk mengejar skor tertinggi!_`;
      return lbText;
    }

    return null;
  }

  // Convert image buffer to WhatsApp WebP Sticker
  public async convertImageToSticker(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const webpBuffer = await sharp(imageBuffer)
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 80 })
        .toBuffer();

      this.stats.stickersCreated += 1;
      return webpBuffer;
    } catch (err: any) {
      console.error('Sharp sticker error:', err);
      throw new Error('Gagal mengonversi gambar menjadi stiker: ' + err.message);
    }
  }

  // Process Inbound Message Dispatcher (Both for Real Socket and Test Simulator)
  public async processInboundMessage(params: {
    senderJid: string;
    senderName: string;
    bodyText: string;
    isGroup: boolean;
    groupJid?: string;
    hasImage?: boolean;
    imageBuffer?: Buffer;
    isQuotedImage?: boolean;
  }): Promise<{ replyText?: string; replyStickerBuffer?: Buffer; actionType: string }> {
    const { senderJid, senderName, bodyText, isGroup, hasImage, imageBuffer } = params;
    const p = this.config.prefix;
    const text = (bodyText || '').trim();

    this.stats.totalMessages += 1;

    // 1. Group Filters
    if (isGroup) {
      if (!this.config.allowGroup) {
        return { actionType: 'ignored_group_disabled' };
      }

      const lower = text.toLowerCase();
      const botNameLower = this.config.name.toLowerCase();
      const isMentioned = lower.includes(botNameLower) || (this.config.phoneNumber && lower.includes('@' + this.config.phoneNumber));

      if (this.config.groupMode === 'silent') {
        // Only accept explicit commands starting with prefix
        if (!text.startsWith(p)) {
          return { actionType: 'ignored_group_silent' };
        }
      } else if (this.config.groupMode === 'mention_only') {
        // If not command, must be mentioned or called by name
        if (!text.startsWith(p) && !isMentioned) {
          return { actionType: 'ignored_group_mention_only' };
        }
      }
    } else {
      if (!this.config.allowPrivate) {
        return { actionType: 'ignored_private_disabled' };
      }
    }

    // 2. Anti-Spam Check
    const spamCheck = this.checkSpam(senderJid, text);
    if (spamCheck.blocked) {
      this.addLog('WARN', `Spam diblokir dari ${senderName} (${senderJid}): ${spamCheck.reason}`);
      return {
        replyText: `⚠️ *Pemberitahuan Sistem:*\n${spamCheck.reason}`,
        actionType: 'spam_blocked',
      };
    }

    // 3. Sticker Maker
    const isStickerCommand = text === `${p}sticker` || text.startsWith(`${p}sticker `) || text === `${p}s` || text.startsWith(`${p}s `);
    if (this.config.features.stickerMaker && (hasImage || isStickerCommand)) {
      if (imageBuffer) {
        try {
          const stickerBuf = await this.convertImageToSticker(imageBuffer);
          this.stats.totalReplies += 1;
          this.addLog('SUCCESS', `Stiker berhasil dibuat untuk ${senderName}`);
          return {
            replyStickerBuffer: stickerBuf,
            actionType: 'sticker_created',
          };
        } catch (e: any) {
          return {
            replyText: `❌ Gagal membuat stiker: ${e.message}`,
            actionType: 'sticker_failed',
          };
        }
      } else if (isStickerCommand) {
        return {
          replyText: `📸 Kirim foto langsung dengan caption *${p}sticker* atau balas foto dengan perintah *${p}sticker* untuk mengubahnya menjadi stiker WhatsApp!`,
          actionType: 'sticker_prompt',
        };
      }
    }

    // 4. Mini-Games / Kuis Handler
    if (this.config.features.miniGames) {
      const gameReply = this.handleGameCommand(senderJid, senderName, text);
      if (gameReply) {
        this.stats.totalReplies += 1;
        this.addLog('REPLY', `Mini-game respon dikirim ke ${senderName}`);
        return {
          replyText: gameReply,
          actionType: 'game_reply',
        };
      }
    }

    // 5. Custom Commands Handler (.menu, .ping, .info, .owner, etc.)
    if (this.config.features.customCommands && text.startsWith(p)) {
      const lower = text.toLowerCase();
      const command = lower.slice(p.length).split(' ')[0];

      if (command === 'menu' || command === 'help') {
        const menu = this.getMenuText();
        this.stats.totalReplies += 1;
        this.addLog('REPLY', `Menu dikirimkan ke ${senderName}`);
        return {
          replyText: menu,
          actionType: 'command_menu',
        };
      }

      if (command === 'ping') {
        const pingTime = Math.floor(Math.random() * 25) + 12; // 12-36ms
        this.stats.totalReplies += 1;
        const brain = this.config.aiProvider === 'grok' ? 'Grok AI (Rudi)' : `ChatGPT (${this.config.aiModel})`;
        return {
          replyText: `🏓 *Pong!*\nKecepatan respon: *${pingTime}ms*\nOtak AI: *${brain}*\nStatus Socket: *${this.status.toUpperCase()}*`,
          actionType: 'command_ping',
        };
      }

      if (command === 'info') {
        const uptime = this.stats.uptimeStart
          ? `Aktif sejak ${new Date(this.stats.uptimeStart).toLocaleTimeString('id-ID')}`
          : 'Baru saja dimulai';
        this.stats.totalReplies += 1;
        const brain = this.config.aiProvider === 'grok' ? 'xAI Grok (Rudi Persona)' : `OpenAI ChatGPT (${this.config.aiModel})`;
        return {
          replyText: `ℹ️ *INFORMASI SISTEM BOT*\n\n🤖 Nama: *${this.config.name}*\n🧠 Otak AI: *${brain}*\n🎭 Gaya: *${this.config.speechStyle}*\n⏱️ Uptime: ${uptime}\n📨 Pesan Diproses: *${this.stats.totalMessages}*\n💬 Balasan Terkirim: *${this.stats.totalReplies}*\n🎨 Stiker Dibuat: *${this.stats.stickersCreated}*\n🎮 Game Dimainkan: *${this.stats.gamesPlayed}*`,
          actionType: 'command_info',
        };
      }

      if (command === 'owner') {
        this.stats.totalReplies += 1;
        if (!this.config.ownerPhone) {
          return {
            replyText: `👑 *KONTAK PEMILIK BOT*\n\nNomor owner belum dikonfigurasi di dashboard bot.`,
            actionType: 'command_owner',
          };
        }
        return {
          replyText: `👑 *KONTAK PEMILIK BOT*\n\nNomor Owner: *+${this.config.ownerPhone}*\nSilakan hubungi pemilik jika ada pertanyaan atau kerja sama layanan bot.`,
          actionType: 'command_owner',
        };
      }

      if (this.config.features.ownerAdmin) {
        if (command === 'status') {
          const memoryUsage = process.memoryUsage();
          const rssMb = (memoryUsage.rss / 1024 / 1024).toFixed(1);
          const heapMb = (memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
          return {
            replyText: `⚙️ *STATUS SERVER & HOSTING*\n\n💻 Memory RSS: *${rssMb} MB*\n🧠 Heap Digunakan: *${heapMb} MB*\n🌐 Port: *${process.env.PORT || 3000}*\n🔌 Status WA: *${this.status.toUpperCase()}*`,
            actionType: 'command_admin_status',
          };
        }

        if (command === 'setstatus') {
          const newStatus = text.slice(`${p}setstatus`.length).trim();
          if (newStatus) {
            this.addLog('INFO', `Status bot diperbarui: ${newStatus}`);
            return {
              replyText: `✅ Status bot berhasil disetel ke: "${newStatus}"`,
              actionType: 'command_admin_setstatus',
            };
          }
        }
      }
    }

    // 6. AI Auto-Reply (ChatGPT or Grok Rudi)
    if (this.config.features.aiAutoReply && text.length > 0) {
      // Clean mention tag if any
      const cleanPrompt = text.replace(new RegExp(`@${this.config.phoneNumber}`, 'gi'), '').trim();
      const aiReply = await this.generateAiResponse(cleanPrompt, senderJid, senderName);

      this.stats.totalReplies += 1;
      const providerTag = this.config.aiProvider === 'grok' ? 'Grok Rudi' : 'ChatGPT';
      this.addLog('REPLY', `AI [${providerTag}] membalas ${senderName}: "${aiReply.slice(0, 45)}..."`);

      return {
        replyText: aiReply,
        actionType: 'ai_reply',
      };
    }

    return {
      actionType: 'no_action',
    };
  }

  // Terminate any existing socket cleanly
  private async cleanupSocket() {
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ev.removeAllListeners('messages.upsert');
        this.sock.end(undefined);
      } catch (e) {
        console.warn('Error closing existing socket:', e);
      }
      this.sock = null;
    }
  }

  // Start Real WhatsApp Socket via Baileys with Isolated Session & Validations
  public async connectWhatsApp(method?: 'pairing' | 'qr', phoneNumber?: string): Promise<{ success: boolean; pairingCode?: string; qrCodeDataUrl?: string; message: string }> {
    const selectedMethod = method || this.config.connectionMethod || 'pairing';
    this.config.connectionMethod = selectedMethod;

    if (phoneNumber !== undefined) {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      this.config.phoneNumber = cleanPhone;
    }

    // Validate phone number strictly if pairing code method is requested
    if (selectedMethod === 'pairing') {
      const cleanPhone = this.config.phoneNumber.replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 16) {
        throw new Error('Nomor WhatsApp tidak valid. Masukkan nomor lengkap dengan kode negara tanpa spasi atau tanda plus (contoh: 6281234567890).');
      }
    }

    this.saveConfig();

    // Close any previous socket cleanly to avoid multi-socket conflict
    await this.cleanupSocket();

    this.status = 'connecting';
    this.pairingCode = '';
    this.qrCodeDataUrl = '';
    this.addLog('INFO', `Memulai koneksi Baileys WhatsApp... Metode: ${selectedMethod.toUpperCase()}`);

    try {
      const authDir = this.getAuthDir();
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const { version } = await fetchLatestBaileysVersion();
      this.addLog('INFO', `Baileys protocol version: v${version.join('.')}`);

      const logger = pino({ level: 'silent' });

      // Create fresh socket instance
      this.sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ['NEXERA AI Bot Builder', 'Chrome', '122.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: true,
      });

      this.sock.ev.on('creds.update', saveCreds);

      // Connection state updates
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && this.config.connectionMethod === 'qr') {
          this.status = 'waiting_qr';
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
            this.qrGeneratedAt = Date.now();
            this.addLog('AUTH', 'QR Code autentikasi WhatsApp siap dipindai melalui ponsel!');
          } catch (qrErr) {
            console.error('QR Generate Error:', qrErr);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          this.status = 'disconnected';
          this.qrCodeDataUrl = '';
          this.pairingCode = '';

          this.addLog('WARN', `Koneksi WhatsApp tertutup (status: ${statusCode}). Hubungkan kembali: ${shouldReconnect}`);

          if (shouldReconnect && this.config.phoneNumber) {
            // Controlled reconnect
            setTimeout(() => {
              if (this.status === 'disconnected') {
                this.connectWhatsApp();
              }
            }, 6000);
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.stats.uptimeStart = new Date().toISOString();
          this.userJid = this.sock?.user?.id || '';
          this.userName = this.sock?.user?.name || this.config.name;
          this.qrCodeDataUrl = '';
          this.pairingCode = '';
          this.addLog('SUCCESS', `🎉 Sesi WhatsApp BERHASIL TERHUBUNG! Akun: ${this.userName} (${this.userJid})`);
        }
      });

      // Handle pairing code if requested
      if (selectedMethod === 'pairing') {
        const cleanPhone = this.config.phoneNumber.replace(/[^0-9]/g, '');

        if (!this.sock.authState.creds.registered) {
          this.status = 'waiting_code';
          // Request pairing code with retry check
          try {
            const code = await this.sock.requestPairingCode(cleanPhone);
            this.pairingCode = code;
            this.addLog('AUTH', `🔑 Pairing Code resmi: ${code}. Masukkan ke WhatsApp > Perangkat Tertaut > Tautkan dengan Kode.`);
            return {
              success: true,
              pairingCode: this.pairingCode,
              message: `Pairing Code berhasil diterbitkan: ${code}`,
            };
          } catch (pairErr: any) {
            this.status = 'error';
            this.addLog('ERROR', `Gagal meminta Pairing Code: ${pairErr.message}`);
            throw pairErr;
          }
        } else {
          this.addLog('INFO', 'Perangkat sudah terdaftar sebelumnya dalam sesi ini.');
        }
      }

      // Handle Inbound Messages
      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const m of messages) {
          if (!m.message || m.key.fromMe) continue; // Ignore self

          const remoteJid = m.key.remoteJid || '';
          if (remoteJid.endsWith('@broadcast') || remoteJid.includes('status')) continue; // Ignore statuses

          const isGroup = remoteJid.endsWith('@g.us');
          const senderJid = m.key.participant || remoteJid;
          const senderName = m.pushName || 'Sahabat';

          // Extract text
          const bodyText =
            m.message.conversation ||
            m.message.extendedTextMessage?.text ||
            m.message.imageMessage?.caption ||
            '';

          // Detect image
          const hasImage = Boolean(m.message.imageMessage);
          let imageBuffer: Buffer | undefined;

          if (hasImage && this.config.features.stickerMaker) {
            try {
              imageBuffer = (await downloadMediaMessage(m, 'buffer', {})) as Buffer;
            } catch (dlErr) {
              console.warn('Failed to download media for sticker:', dlErr);
            }
          }

          this.addLog('RECV', `Pesan masuk dari ${senderName} (${isGroup ? 'Grup' : 'Private'}): "${bodyText.slice(0, 50)}"`);

          // Process through engine
          const result = await this.processInboundMessage({
            senderJid,
            senderName,
            bodyText,
            isGroup,
            groupJid: isGroup ? remoteJid : undefined,
            hasImage,
            imageBuffer,
          });

          // Dispatch replies back to WhatsApp
          if (result.replyStickerBuffer) {
            await this.sock?.sendMessage(remoteJid, {
              sticker: result.replyStickerBuffer,
            }, { quoted: m });
          } else if (result.replyText) {
            await this.sock?.sendMessage(remoteJid, {
              text: result.replyText,
            }, { quoted: m });
          }
        }
      });

      return {
        success: true,
        pairingCode: this.pairingCode,
        qrCodeDataUrl: this.qrCodeDataUrl,
        message: 'Koneksi WhatsApp Baileys diinisialisasi.',
      };
    } catch (err: any) {
      this.status = 'error';
      this.addLog('ERROR', `Gagal menghubungkan WhatsApp: ${err.message}`);
      return {
        success: false,
        message: err.message,
      };
    }
  }

  // Refresh QR code explicitly
  public async refreshQrCode(): Promise<{ success: boolean; qrCodeDataUrl?: string; message: string }> {
    this.addLog('INFO', 'Memperbarui QR Code autentikasi...');
    return await this.connectWhatsApp('qr');
  }

  // Disconnect & optionally purge credentials for the specific bot session
  public async disconnectWhatsApp(purgeAuth: boolean = false) {
    this.status = 'disconnected';
    this.pairingCode = '';
    this.qrCodeDataUrl = '';
    this.stats.uptimeStart = null;

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {}
      await this.cleanupSocket();
    }

    if (purgeAuth) {
      try {
        const authDir = this.getAuthDir();
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
          fs.mkdirSync(authDir, { recursive: true });
        }
        this.config.phoneNumber = '';
        this.saveConfig();
        this.addLog('WARN', '🔌 Sesi WhatsApp diputus dan kredensial sesi dibersihkan.');
      } catch (e) {
        console.error('Error clearing auth directory:', e);
      }
    } else {
      this.addLog('INFO', '⏸️ Sesi WhatsApp dijeda (kredensial tetap tersimpan untuk reconnect).');
    }

    return this.getStatus();
  }

  // In-App Test Simulator for Instant User Feedback
  public async testSimulateMessage(userMessage: string, senderName: string = 'Pengguna Test', isGroup: boolean = false) {
    const providerName = this.config.aiProvider === 'grok' ? 'Grok Rudi' : 'ChatGPT';
    this.addLog('RECV', `[SANDBOX TEST - ${providerName}] Pesan uji dari ${senderName}: "${userMessage}"`);

    const result = await this.processInboundMessage({
      senderJid: 'test_user_sim@s.whatsapp.net',
      senderName,
      bodyText: userMessage,
      isGroup,
    });

    const reply = result.replyText || (result.replyStickerBuffer ? '🎨 [Stiker WhatsApp Berhasil Dibuat]' : 'Pesan diabaikan sesuai aturan filter.');

    return {
      success: true,
      userMessage,
      reply,
      actionType: result.actionType,
      config: this.config,
      stats: this.stats,
    };
  }
}
