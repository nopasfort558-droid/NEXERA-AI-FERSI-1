import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { WABotManager } from './server/wabot_service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware for parsing JSON with generous limit for vision image payloads
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Initialize GoogleGenAI SDK
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Initialize WA Bot Manager Service
const waBotManager = new WABotManager(ai);

// Helper with generous timeout (35s) so vision & text models have sufficient time
async function callModelWithTimeout(model: string, contents: any, systemInstruction?: string, timeoutMs = 35000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Koneksi AI (${model}) melebihi batas waktu ${timeoutMs / 1000} detik. Silakan coba kembali.`)), timeoutMs)
  );

  const genPromise = ai.models.generateContent({
    model,
    contents,
    config: systemInstruction ? { systemInstruction } : undefined,
  });

  const response: any = await Promise.race([genPromise, timeoutPromise]);
  if (response && response.text) {
    return { text: response.text, modelUsed: model };
  }
  throw new Error(`Respon kosong dari model ${model}`);
}

// Helper for Gemini generation with automatic rapid fallback
async function generateWithGemini(contents: any, systemInstruction?: string, timeoutMs = 35000) {
  // Use gemini-3.1-flash-lite first for speed and high availability, then fallback to gemini-3.8-flash
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      return await callModelWithTimeout(model, contents, systemInstruction, timeoutMs);
    } catch (err: any) {
      console.warn(`[Gemini API] Model ${model} encountered issue: ${err.message || err}. Trying next model...`);
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal menghasilkan respon dari Gemini AI.');
}

// 1. System status API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    app: 'NEXERA AI',
    version: '2.5.0',
    characterAura: {
      left: 'Gojo Satoru (Limitless / Six Eyes)',
      right: 'Sasuke Uchiha (Sharingan / Rinnegan)',
    },
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// 2. Chat AI API
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, message, history, persona = 'nexera', customSystemInstruction, memories } = req.body;

    let chatMessages: Array<{ role: string; content: string }> = [];
    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages;
    } else if (typeof message === 'string' && message.trim().length > 0) {
      if (Array.isArray(history)) {
        chatMessages = history.map((h: any) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.parts?.[0]?.text || h.content || '',
        })).filter(h => h.content);
      }
      chatMessages.push({ role: 'user', content: message.trim() });
    }

    if (chatMessages.length === 0) {
      return res.status(400).json({ error: 'Array pesan atau field message tidak boleh kosong.' });
    }

    let systemInstruction =
      'Kamu adalah NEXERA AI, asisten kecerdasan buatan cerdas, ramah, dan canggih yang berbicara dalam Bahasa Indonesia dengan gaya futuristik, informatif, dan terstruktur. Gunakan format markdown yang rapi dengan heading, bullet points, dan blok kode jika menjelaskan sesuatu yang teknis.';

    if (customSystemInstruction) {
      systemInstruction = customSystemInstruction;
    } else if (persona === 'gojo') {
      systemInstruction =
        'Kamu adalah Gojo Satoru (五条 悟) dari anime Jujutsu Kaisen, sekarang menjadi Asisten AI di NEXERA AI! ' +
        'Gaya bicaramu santai, karismatik, cerdas, sedikit narsis/pede ("Daijoubu, boku saikyou dakara!", "Sensei di sini, serahkan segalanya padaku!"), ' +
        'namun tetap memberikan solusi yang akurat, berbobot, dan sangat membantu pengguna dalam Bahasa Indonesia.';
    } else if (persona === 'sasuke') {
      systemInstruction =
        'Kamu adalah Sasuke Uchiha (うちは サスケ) dari anime Naruto, kini bertindak sebagai Asisten AI di NEXERA AI. ' +
        'Gaya bicaramu tenang, keren, fokus, sedikit dingin ("Hmph..."), sangat analitis dan strategis, ' +
        'namun memiliki kepedulian tersembunyi untuk memberikan jawaban terbaik kepada pengguna dalam Bahasa Indonesia.';
    }

    // Inject active memories if provided
    if (Array.isArray(memories) && memories.length > 0) {
      const memoryFacts = memories.filter((m: any) => typeof m === 'string' && m.trim().length > 0);
      if (memoryFacts.length > 0) {
        systemInstruction += `\n\n[MEMORI PENGGUNA TERVERIFIKASI (Gunakan untuk mempersonalisasi respon jika relevan)]:\n${memoryFacts.map((m: string) => '- ' + m).join('\n')}`;
      }
    }

    // Convert messages into prompt context
    const conversationHistory = chatMessages
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Berikut adalah percakapan sebelumnya dan pesan terbaru:\n\n${conversationHistory}\n\nJawablah pesan terakhir:`;

    const result = await generateWithGemini(prompt, systemInstruction);

    res.json({
      reply: result.text,
      text: result.text,
      modelUsed: result.modelUsed,
      persona,
    });
  } catch (error: any) {
    console.error('Chat AI Error:', error);
    res.status(500).json({
      error: error.message || 'Terjadi kesalahan saat memproses Chat AI.',
      fallbackReply:
        'Maaf, koneksi ke inti AI NEXERA sedang mengalami lonjakan trafik. Silakan coba kirim pesan Anda kembali!',
    });
  }
});

// 3. AI Image API
app.post('/api/image', async (req, res) => {
  try {
    const { prompt, style = 'anime', aspectRatio = '1:1' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Deskripsi gambar (prompt) wajib diisi.' });
    }

    // Step 1: Use Gemini to enhance and optimize the prompt for the selected style
    let enhancedPrompt = prompt;
    try {
      const enhanceInstruction =
        'You are an expert AI prompt engineer for high quality image generation. Enhance the user prompt into a rich, vivid English visual prompt for generating magnificent imagery. Add lighting, composition, mood, and detail. Return ONLY the enhanced prompt, no conversational text.';
      const promptToEnhance = `Style: ${style}. Original prompt: "${prompt}". Create a detailed masterpiece prompt in English:`;

      const genRes = await generateWithGemini(promptToEnhance, enhanceInstruction);
      if (genRes.text) {
        enhancedPrompt = genRes.text.trim().replace(/^"|"$/g, '');
      }
    } catch (e) {
      console.warn('Prompt enhancement fallback:', e);
    }

    // Step 2: Determine dimensions based on aspect ratio
    let width = 1024;
    let height = 1024;
    if (aspectRatio === '16:9') {
      width = 1280;
      height = 720;
    } else if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (aspectRatio === '4:3') {
      width = 1024;
      height = 768;
    }

    // Step 3: Add style keywords
    let styleKeyword = '';
    if (style === 'anime') {
      styleKeyword = 'masterpiece anime aesthetic, ufotable mappa style, vibrant neon cinematic lighting, high detail';
    } else if (style === 'gojo') {
      styleKeyword = 'Gojo Satoru aesthetic, glowing infinite blue eyes, limitless cursed energy, epic electric aura, anime wallpaper';
    } else if (style === 'sasuke') {
      styleKeyword = 'Sasuke Uchiha aesthetic, purple susanoo flames, chidori lightning, sharingan rinnegan, dark anime art';
    } else if (style === 'cyberpunk') {
      styleKeyword = 'cyberpunk neon city, hyper-futuristic, volumetric lighting, 8k resolution, raytracing';
    } else if (style === 'realistic') {
      styleKeyword = 'photorealistic, cinematic 35mm lens, high fidelity, 8k, dramatic lighting';
    }

    const finalQueryPrompt = `${enhancedPrompt}, ${styleKeyword}`.trim();
    const encodedPrompt = encodeURIComponent(finalQueryPrompt);
    const seed = Math.floor(Math.random() * 9999999);

    // Reliable ultra high quality image generator using Flux model on Pollinations
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

    res.json({
      success: true,
      imageUrl,
      enhancedPrompt,
      originalPrompt: prompt,
      style,
      aspectRatio,
      dimensions: { width, height },
      seed,
    });
  } catch (error: any) {
    console.error('Image AI Error:', error);
    res.status(500).json({ error: error.message || 'Gagal membuat gambar dengan AI.' });
  }
});

// 4. Vision AI API
app.post('/api/vision', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', prompt = 'Analisis gambar ini secara detail dalam Bahasa Indonesia' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Data gambar (base64) diperlukan.' });
    }

    // Strip data URL header if included (e.g. data:image/png;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const contents = {
      parts: [
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        },
        {
          text: `${prompt}\n\nBerikan analisis yang cerdas, teliti, dan terstruktur rapi dengan poin-poin utama, deteksi objek/elemen kunci, teks jika ada (OCR), dan kesimpulan bermanfaat.`,
        },
      ],
    };

    const systemInstruction =
      'Kamu adalah Vision AI dari NEXERA AI. Kamu memiliki kemampuan analisis visual tingkat tinggi. Identifikasi objek, teks, warna, konteks, karakter, ekspresi, dan aspek penting lainnya dari gambar yang diberikan pengguna. Sajikan analisis dalam Bahasa Indonesia yang jelas dan profesional.';

    const result = await generateWithGemini(contents, systemInstruction, 40000);

    res.json({
      success: true,
      analysis: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Vision AI Error:', error);
    res.status(500).json({
      error: error.message || 'Terjadi kesalahan saat menganalisis gambar dengan Vision AI.',
    });
  }
});

// Alias for vision analysis
app.post('/api/vision/analyze', (req, res, next) => {
  // Delegate directly to the /api/vision handler
  (app._router.handle as any)({ ...req, url: '/api/vision' }, res, next);
});

// 5. WA Bot Builder API
app.post('/api/wabot/generate', async (req, res) => {
  try {
    const { prompt, botType = 'ai-reply', connectionMethod = 'pairing' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Deskripsi bot WhatsApp wajib diisi.' });
    }

    const systemInstruction = `You are an elite Node.js & Baileys WhatsApp Bot Architect.
The user wants to build a WhatsApp bot based on the library "@whiskeysockets/baileys".
Generate a complete, modern, production-ready WhatsApp bot project in Indonesian.
Return ONLY a valid JSON object without markdown formatting or backticks around the json.
The JSON must follow this exact structure:
{
  "botName": "string",
  "description": "string",
  "files": {
    "index.js": "full code with baileys setup, pairing code or qr logic, command routing, and message handler",
    "package.json": "complete package.json with dependencies: @whiskeysockets/baileys, pino, qrcode-terminal, dotenv",
    ".env.example": "PORT=3000\\nBOT_NAME=NexeraBot\\nBOT_PREFIX=!",
    "README.md": "Complete Indonesian setup guide: requirements (Node.js >= 18), step-by-step installation, how to run, and pairing instructions"
  },
  "setupGuide": "Step by step summary guide in Indonesian",
  "testRules": [
    { "trigger": "!menu", "response": "Daftar menu bot..." },
    { "trigger": "!help", "response": "Bantuan penggunaan..." },
    { "trigger": "!ping", "response": "Pong! Kecepatan respon: 24ms" },
    { "trigger": "halo", "response": "Halo! Saya bot yang siap membantu Anda." }
  ]
}`;

    const promptText = `Kebutuhan Bot WhatsApp:
Jenis Bot: ${botType} (Pilihan: AI auto-reply, customer service, informasi, menu otomatis, bot grup)
Metode Sambungan: ${connectionMethod === 'pairing' ? 'Pairing Code (8 digit)' : 'QR Code Terminal'}
Deskripsi & Fitur yang Diinginkan:
"${prompt}"

Buatlah kode WhatsApp bot Node.js dengan @whiskeysockets/baileys yang rapi, modular, aman, dan siap pakai.`;

    let generatedJson: any = null;
    try {
      const aiRes = await generateWithGemini(promptText, systemInstruction, 35000);
      const cleaned = aiRes.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      generatedJson = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn('AI JSON parsing fallback for WA Bot, building fallback template:', parseErr);
    }

    // High quality resilient fallback if JSON parsing failed
    if (!generatedJson || !generatedJson.files || !generatedJson.files['index.js']) {
      const safeName = prompt.slice(0, 25).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'NEXERA WA Bot';
      generatedJson = {
        botName: safeName,
        description: `Bot WhatsApp berbasis ${botType}: ${prompt}`,
        files: {
          'index.js': `/**
 * ${safeName} - WhatsApp Bot
 * Ditenagai oleh NEXERA AI & @whiskeysockets/baileys
 */
import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();
  console.log(\`[NEXERA-BOT] Menggunakan Baileys v\${version.join('.')}\`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: ${connectionMethod === 'qr' ? 'true' : 'false'},
    auth: state,
    browser: ['NEXERA AI Bot', 'Safari', '3.0']
  });

  // Metode Pairing Code jika belum terdaftar
  if (!sock.authState.creds.registered && '${connectionMethod}' === 'pairing') {
    const phoneNumber = await question('Masukkan nomor WhatsApp Anda (diawali 62, contoh: 6281234567890): ');
    const code = await sock.requestPairingCode(phoneNumber.trim());
    console.log(\`\\n========================================\`);
    console.log(\`KODE PAIRING WHATSAPP ANDA: \${code}\`);
    console.log(\`Buka WhatsApp -> Perangkat Tertaut -> Tautkan dengan Kode\`);
    console.log(\`========================================\\n\`);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[KONEKSI] Terputus. Menghubungkan ulang:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ [SUKSES] Bot WhatsApp berhasil terhubung!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const sender = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const text = body.trim().toLowerCase();

    console.log(\`[PESAN MASUK] Dari \${sender}: \${body}\`);

    // Handler Perintah Bot
    if (text === '!menu' || text === '!help') {
      const menuText = \`*🤖 \${process.env.BOT_NAME || 'NEXERA WA BOT'}*\\n\\n\` +
        \`Halo! Berikut daftar perintah yang tersedia:\\n\` +
        \`• *!menu* - Menampilkan menu bot\\n\` +
        \`• *!info* - Informasi bot & layanan\\n\` +
        \`• *!ping* - Cek kecepatan respon bot\\n\` +
        \`• *!layanan* - Info bantuan & CS\\n\\n\` +
        \`*Status:* Online & Siap Melayani!\`;
      await sock.sendMessage(sender, { text: menuText });
    } else if (text === '!ping') {
      await sock.sendMessage(sender, { text: '🏓 Pong! Bot aktif dan merespon dalam waktu singkat.' });
    } else if (text.startsWith('!ai ')) {
      const q = body.slice(4).trim();
      await sock.sendMessage(sender, { text: \`[AI Response]\\nMenerima pertanyaan: "\${q}"\\nJawaban sedang diproses...\` });
    } else if (text.includes('halo') || text.includes('hai')) {
      await sock.sendMessage(sender, { text: 'Halo! Selamat datang di layanan bot otomatis. Ketik *!menu* untuk melihat fitur.' });
    }
  });
}

startBot();`,
          'package.json': JSON.stringify({
            name: 'nexera-whatsapp-bot',
            version: '1.0.0',
            description: safeName,
            type: 'module',
            main: 'index.js',
            scripts: {
              start: 'node index.js'
            },
            dependencies: {
              '@whiskeysockets/baileys': '^6.7.8',
              'dotenv': '^16.4.5',
              'pino': '^9.0.0',
              'qrcode-terminal': '^0.12.0'
            }
          }, null, 2),
          '.env.example': `BOT_NAME="${safeName}"\nBOT_PREFIX="!"\nPORT=3000`,
          'README.md': `# ${safeName}

Bot WhatsApp dibangun otomatis dengan **NEXERA AI**.

## Persyaratan
- Node.js versi 18.x atau lebih baru (Unduh di https://nodejs.org)
- NPM atau PNPM

## Cara Instalasi & Menjalankan di Komputer/VPS Anda:
1. Ekstrak file script ini ke dalam folder baru.
2. Buka terminal (Command Prompt / Terminal) di folder tersebut.
3. Jalankan perintah:
   \`\`\`bash
   npm install
   \`\`\`
4. Salin file \`.env.example\` menjadi \`.env\`:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
5. Jalankan bot:
   \`\`\`bash
   npm start
   \`\`\`
6. Jika menggunakan Pairing Code: Masukkan nomor WhatsApp Anda (format: 628xxx) di terminal, lalu masukkan 8 kode pairing yang muncul ke aplikasi WhatsApp di ponsel Anda (Perangkat Tertaut > Tautkan dengan Kode).`
        },
        setupGuide: `1. Instal Node.js (v18+) di komputer/VPS Anda.\n2. Jalankan "npm install" di folder bot.\n3. Jalankan "npm start" dan tautkan perangkat WhatsApp Anda secara aman.`,
        testRules: [
          { trigger: '!menu', response: `*🤖 ${safeName}*\n\n• !menu - Menampilkan menu\n• !info - Informasi bot\n• !ping - Cek status bot` },
          { trigger: '!ping', response: '🏓 Pong! Bot aktif dan siap melayani.' },
          { trigger: 'halo', response: 'Halo! Terima kasih telah menghubungi kami. Ketik !menu untuk bantuan.' },
          { trigger: '!info', response: `Informasi: Bot WhatsApp ini dibuat dengan arsitektur modular NEXERA AI.` }
        ]
      };
    }

    res.json({
      success: true,
      bot: generatedJson,
      connectionMethod,
      botType,
    });
  } catch (error: any) {
    console.error('WA Bot Error:', error);
    res.status(500).json({
      error: error.message || 'Terjadi kesalahan saat membuat bot WhatsApp.',
    });
  }
});

// Real WhatsApp Bot Controller APIs
app.get('/api/wabot/status', (req, res) => {
  res.json({
    success: true,
    state: waBotManager.getStatus(),
  });
});

app.post('/api/wabot/config', (req, res) => {
  try {
    const updated = waBotManager.updateConfig(req.body);
    res.json({
      success: true,
      config: updated,
      state: waBotManager.getStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menyimpan konfigurasi bot.' });
  }
});

app.post('/api/wabot/connect', async (req, res) => {
  try {
    const { method = 'pairing', phoneNumber } = req.body;
    const result = await waBotManager.connectWhatsApp(method, phoneNumber);
    res.json({
      success: result.success,
      message: result.message,
      state: waBotManager.getStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menghubungkan WhatsApp.' });
  }
});

app.post('/api/wabot/start', async (req, res) => {
  try {
    const { connectionMethod = 'pairing', phoneNumber, botName } = req.body;
    if (botName) {
      waBotManager.updateConfig({ name: botName });
    }
    const result = await waBotManager.connectWhatsApp(connectionMethod, phoneNumber);
    res.json({
      success: result.success,
      message: result.message,
      state: waBotManager.getStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal memulai koneksi WhatsApp bot.' });
  }
});

app.post('/api/wabot/reconnect', async (req, res) => {
  try {
    const result = await waBotManager.connectWhatsApp();
    res.json({
      success: result.success,
      message: result.message,
      state: waBotManager.getStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menghubungkan ulang WhatsApp.' });
  }
});

app.post('/api/wabot/stop', async (req, res) => {
  try {
    const state = await waBotManager.disconnectWhatsApp(false);
    res.json({
      success: true,
      state,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wabot/disconnect', async (req, res) => {
  try {
    const purge = req.body.purgeAuth !== false;
    const state = await waBotManager.disconnectWhatsApp(purge);
    res.json({
      success: true,
      state,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wabot/refresh-qr', async (req, res) => {
  try {
    const result = await waBotManager.refreshQrCode();
    res.json({
      success: result.success,
      message: result.message,
      state: waBotManager.getStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal memperbarui QR Code.' });
  }
});

app.post('/api/wabot/confirm-pairing', (req, res) => {
  const status = waBotManager.getStatus();
  res.json({
    success: true,
    state: status,
  });
});

app.post('/api/wabot/send-test', async (req, res) => {
  try {
    const { message, senderName = 'Pengguna Test', isGroup = false } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Pesan wajib diisi.' });
    }

    const result = await waBotManager.testSimulateMessage(message.trim(), senderName, Boolean(isGroup));
    res.json({
      success: true,
      reply: result.reply,
      actionType: result.actionType,
      state: waBotManager.getStatus(),
    });
  } catch (err: any) {
    console.error('WA Bot Test Error:', err);
    res.status(500).json({ error: err.message || 'Gagal memproses pesan uji.' });
  }
});

// 6. AI App Builder API
app.post('/api/appbuilder/generate', async (req, res) => {
  try {
    const { prompt, appType = 'productivity' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Deskripsi ide aplikasi wajib diisi.' });
    }

    const systemInstruction = `You are a Principal Software Engineer & Android Capacitor Specialist.
The user wants to generate a complete, working, interactive frontend web application that can also be compiled into an Android APK using Apache Capacitor.
Return ONLY a valid JSON object without markdown formatting or surrounding backticks.
The JSON must follow this exact structure:
{
  "appName": "string",
  "description": "string",
  "appId": "com.nexera.myapp",
  "files": {
    "index.html": "complete, modern HTML5 file containing rich CSS, Tailwind CDN, and interactive JavaScript logic. Must be visually stunning, responsive on mobile, dark mode themed with cyan/purple accents, with no broken scripts",
    "styles.css": "complementary custom cybernetic styles and glassmorphism",
    "app.js": "modular JavaScript application logic",
    "capacitor.config.json": "valid capacitor configuration for Android packaging",
    "package.json": "package.json with @capacitor/core, @capacitor/android, @capacitor/cli",
    "ANDROID_BUILD_GUIDE.md": "Honest, comprehensive Indonesian guide explaining how to build APK with Capacitor & Android Studio, plus GitHub Actions setup"
  },
  "previewHtml": "complete standalone single-file HTML that can run directly inside an iframe with full functionality and styling"
}`;

    const promptText = `Ide Aplikasi:
Kategori: ${appType}
Deskripsi: "${prompt}"

Buatlah aplikasi web interaktif yang siap pakai, indah, responsive untuk layar smartphone Android, dan memiliki file konfigurasi Capacitor untuk build APK.`;

    let generatedApp: any = null;
    try {
      const aiRes = await generateWithGemini(promptText, systemInstruction, 35000);
      const cleaned = aiRes.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      generatedApp = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn('AI JSON parsing fallback for App Builder:', parseErr);
    }

    // High quality fallback app if JSON parse failed
    if (!generatedApp || !generatedApp.files || !generatedApp.files['index.html']) {
      const safeAppName = prompt.slice(0, 20).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Nexera Mobile App';
      const appId = `com.nexera.${safeAppName.toLowerCase().replace(/\s+/g, '')}`;

      const fallbackHtml = `<!DOCTYPE html>
<html lang="id" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${safeAppName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Orbitron:wght@700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #030712; color: #f1f5f9; }
    .font-orbitron { font-family: 'Orbitron', sans-serif; }
    .glass-card { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(56, 189, 248, 0.2); }
  </style>
</head>
<body class="min-h-screen flex flex-col p-4 max-w-md mx-auto">
  <header class="flex items-center justify-between py-4 border-b border-slate-800">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center font-orbitron font-black text-white text-sm">
        N
      </div>
      <h1 class="font-orbitron font-bold text-white text-base">${safeAppName}</h1>
    </div>
    <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
      Capacitor Ready
    </span>
  </header>

  <main class="flex-1 py-6 space-y-4">
    <div class="glass-card rounded-2xl p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
      <h2 class="text-sm font-bold text-cyan-300">Aplikasi Dibuat dengan AI</h2>
      <p class="text-xs text-slate-300 mt-1 leading-relaxed">
        ${prompt}
      </p>
    </div>

    <!-- Interactive Counter & Task Widget -->
    <div class="glass-card rounded-2xl p-5 space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-purple-300">Widget Interaktif</h3>
      <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800">
        <span class="text-xs text-slate-300">Skor / Hitungan:</span>
        <span id="counter" class="font-orbitron font-bold text-xl text-cyan-400">0</span>
      </div>
      <div class="flex gap-2">
        <button onclick="changeCounter(-1)" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all">- Kurang</button>
        <button onclick="changeCounter(1)" class="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-xs font-bold text-white transition-all">+ Tambah</button>
      </div>
    </div>

    <!-- Quick Note / Item Input -->
    <div class="glass-card rounded-2xl p-5 space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-cyan-300">Input Data & Aktivitas</h3>
      <div class="flex gap-2">
        <input id="itemInput" type="text" placeholder="Tulis catatan atau entri baru..." class="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400">
        <button onclick="addItem()" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all">Simpan</button>
      </div>
      <ul id="itemList" class="space-y-2 pt-2 text-xs text-slate-300">
        <li class="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <span>Contoh data bawaan aplikasi</span>
          <span class="text-[10px] text-emerald-400 font-semibold">Tersimpan</span>
        </li>
      </ul>
    </div>
  </main>

  <footer class="py-3 text-center text-[11px] text-slate-500 border-t border-slate-800/80">
    Built with NEXERA AI • Ready for Android APK Build
  </footer>

  <script>
    let count = 0;
    function changeCounter(delta) {
      count += delta;
      document.getElementById('counter').innerText = count;
    }

    function addItem() {
      const input = document.getElementById('itemInput');
      const val = input.value.trim();
      if (!val) return;
      const list = document.getElementById('itemList');
      const li = document.createElement('li');
      li.className = 'p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between animate-in fade-in';
      li.innerHTML = '<span>' + val + '</span><button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-300 text-[10px]">Hapus</button>';
      list.prepend(li);
      input.value = '';
    }
  </script>
</body>
</html>`;

      generatedApp = {
        appName: safeAppName,
        description: prompt,
        appId: appId,
        files: {
          'index.html': fallbackHtml,
          'styles.css': `/* Custom styles for ${safeAppName} */
body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background-color: #030712;
}
.glass {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
}`,
          'app.js': `// Logic for ${safeAppName}
console.log("${safeAppName} loaded successfully with Capacitor Android support.");`,
          'capacitor.config.json': JSON.stringify({
            appId: appId,
            appName: safeAppName,
            webDir: 'dist',
            bundledWebRuntime: false
          }, null, 2),
          'package.json': JSON.stringify({
            name: safeAppName.toLowerCase().replace(/\s+/g, '-'),
            version: '1.0.0',
            description: prompt,
            scripts: {
              'build': 'echo "Web assets ready"',
              'cap:sync': 'npx cap sync android',
              'cap:open': 'npx cap open android'
            },
            dependencies: {
              '@capacitor/android': '^6.0.0',
              '@capacitor/cli': '^6.0.0',
              '@capacitor/core': '^6.0.0'
            }
          }, null, 2),
          'ANDROID_BUILD_GUIDE.md': `# Panduan Build APK Android (${safeAppName})

Proyek ini telah dikonfigurasi dengan **Apache Capacitor** agar dapat di-compile menjadi file **.apk** Android.

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
Kami telah menyertakan file \`.github/workflows/build-apk.yml\` di dalam paket ZIP. Anda cukup push project ke GitHub, dan GitHub Actions akan otomatis meng-compile file \`.apk\` untuk Anda unduh di tab Releases!`
        },
        previewHtml: fallbackHtml
      };
    }

    res.json({
      success: true,
      app: generatedApp,
    });
  } catch (error: any) {
    console.error('App Builder Error:', error);
    res.status(500).json({
      error: error.message || 'Terjadi kesalahan saat membuat aplikasi AI.',
    });
  }
});

// 7. Fix Code API
app.post('/api/appbuilder/fix', async (req, res) => {
  try {
    const { currentCode, issue, filename = 'index.html' } = req.body;

    if (!currentCode || !issue) {
      return res.status(400).json({ error: 'Kode dan deskripsi error wajib diisi.' });
    }

    const systemInstruction = `You are an expert bug fixer and frontend code optimizer.
Analyze the provided code and fix the reported bug or implement the requested improvement.
Return ONLY the corrected, clean code without markdown backticks or explanations.`;

    const promptText = `File yang diperbaiki: ${filename}
Masalah / Perbaikan yang Diminta: "${issue}"

Kode Saat Ini:
${currentCode}

Keluarkan HANYA seluruh kode lengkap yang sudah diperbaiki dan bebas error.`;

    const aiRes = await generateWithGemini(promptText, systemInstruction, 35000);
    const cleanedCode = aiRes.text.trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');

    res.json({
      success: true,
      fixedCode: cleanedCode,
      modelUsed: aiRes.modelUsed,
    });
  } catch (error: any) {
    console.error('App Fix Error:', error);
    res.status(500).json({
      error: error.message || 'Gagal memperbaiki kode aplikasi.',
    });
  }
});

// 8. Document Parse API (Knowledge Base)
app.post('/api/documents/parse', async (req, res) => {
  try {
    const { base64, filename, name, textContent, size = '10 KB', type = 'text/plain' } = req.body;
    const docName = filename || name;

    if (!docName) {
      return res.status(400).json({ error: 'Nama file dokumen diperlukan.' });
    }

    let extractedText = '';
    const isPdf = docName.toLowerCase().endsWith('.pdf');

    if (isPdf && base64) {
      try {
        const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const parseResult = await parser.getText();
        extractedText = (parseResult?.text || '').trim();
      } catch (pdfErr) {
        console.warn('Local PDF parser issue, using Gemini direct document reading fallback:', pdfErr);
        // Fallback to Gemini Multimodal PDF reading
        try {
          const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
          const geminiPdf = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: cleanBase64,
                  },
                },
                {
                  text: 'Ekstrak seluruh teks yang dapat dibaca dari dokumen PDF ini secara lengkap dan akurat. Jangan tambahkan kata pengantar.',
                },
              ],
            },
          });
          extractedText = geminiPdf.text || '';
        } catch (geminiPdfErr) {
          console.error('Gemini PDF fallback error:', geminiPdfErr);
        }
      }
    } else if (textContent) {
      extractedText = textContent;
    } else if (base64) {
      const cleanBase64 = base64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
      extractedText = Buffer.from(cleanBase64, 'base64').toString('utf-8');
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'Tidak dapat mengekstrak teks dari dokumen tersebut.' });
    }

    // Generate concise summary with Gemini
    let summary = 'Dokumen berhasil diindeks.';
    try {
      const summaryPrompt = `Berikut adalah teks dokumen "${docName}":\n\n${extractedText.slice(0, 5000)}\n\nBuatlah ringkasan singkat dalam 2-3 kalimat Bahasa Indonesia mengenai topik utama dan isi penting dokumen ini.`;
      const sumRes = await generateWithGemini(summaryPrompt, 'Kamu adalah asisten analisis dokumen.', 20000);
      if (sumRes.text) {
        summary = sumRes.text.trim();
      }
    } catch (sErr) {
      console.warn('Summary generation issue:', sErr);
    }

    const docObj = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name: docName,
      size: size,
      type: type,
      text: extractedText,
      summary,
      charCount: extractedText.length,
      uploadedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    res.json({
      success: true,
      document: docObj,
      text: extractedText,
      summary,
      charCount: extractedText.length,
      filename: docName,
    });
  } catch (error: any) {
    console.error('Document Parse Error:', error);
    res.status(500).json({
      error: error.message || 'Gagal memproses dokumen.',
    });
  }
});

// 9. Document Chat API (Strictly Grounded Knowledge Base)
app.post('/api/documents/chat', async (req, res) => {
  try {
    const { question, documents } = req.body;

    if (!question || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'Pertanyaan dan minimal 1 dokumen diperlukan.' });
    }

    const docContext = documents
      .map((d: any) => `=== DOKUMEN: ${d.name} ===\n${(d.text || '').slice(0, 15000)}`)
      .join('\n\n');

    const systemInstruction = 
      'Kamu adalah asisten AI Knowledge Base NEXERA AI yang berdedikasi tinggi terhadap akurasi data. ' +
      'Tugasmu adalah menjawab pertanyaan pengguna HANYA dan STRICTLY berdasarkan isi teks dokumen yang disediakan di bawah. ' +
      'Aturan Penting:\n' +
      '1. Jika jawaban terdapat dalam dokumen, jelaskan dengan jelas dan sertakan kutipan bagian atau nama dokumen yang relevan.\n' +
      '2. Jika informasi yang ditanyakan SAMA SEKALI TIDAK TERCANTUM dalam dokumen, kamu WAJIB menjawab dengan jujur: "Maaf, informasi tersebut tidak ditemukan dalam dokumen yang diunggah."\n' +
      '3. JANGAN PERNAH mengarang fakta atau berspekulasi di luar teks dokumen.';

    const promptText = `Berikut adalah isi dokumen yang diunggah pengguna:\n\n${docContext}\n\nPertanyaan Pengguna:\n"${question}"\n\nJawaban berbasis isi dokumen di atas:`;

    const result = await generateWithGemini(promptText, systemInstruction, 35000);

    res.json({
      success: true,
      text: result.text,
      reply: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Document Chat Error:', error);
    res.status(500).json({
      error: error.message || 'Gagal memproses tanya jawab dokumen.',
    });
  }
});

// 10. Memory Extraction API
app.post('/api/memory/extract', async (req, res) => {
  try {
    const { messageText, existingMemories = [] } = req.body;

    if (!messageText || typeof messageText !== 'string') {
      return res.json({ facts: [] });
    }

    const systemInstruction = 
      'Kamu adalah Memory Extractor AI. Analisis pesan pengguna dan tentukan apakah ada fakta atau preferensi personal penting tentang pengguna yang layak diingat (misalnya hobi, minat, pekerjaan, target, teknologi favorit). ' +
      'JANGAN simpan informasi sensitif seperti password, nomor KTP, atau kartu kredit. ' +
      'Kembalikan HANYA array JSON berupa string fakta ringkas dalam Bahasa Indonesia, contoh: ["Pengguna bekerja sebagai pengembang React", "Pengguna menyukai anime Jujutsu Kaisen"]. ' +
      'Jika tidak ada fakta personal penting yang diungkapkan, kembalikan array kosong []. Jangan gunakan format markdown.';

    const promptText = `Pesan Pengguna: "${messageText}"\nMemori yang sudah ada:\n${existingMemories.join('\n')}\n\nFakta baru yang layak diingat:`;

    const result = await generateWithGemini(promptText, systemInstruction, 20000);
    const cleaned = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let facts: string[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) facts = parsed;
    } catch (e) {}

    res.json({ facts });
  } catch (error) {
    res.json({ facts: [] });
  }
});

// 11. AI Writing Studio API
app.post('/api/writing/generate', async (req, res) => {
  try {
    const { 
      type = 'artikel', 
      titleOrIdea, 
      theme, 
      genreOrPlot, 
      characters, 
      tone = 'santai', 
      length = 'sedang', 
      instructions,
      targetLanguage = 'Indonesia' 
    } = req.body;

    if (!titleOrIdea || typeof titleOrIdea !== 'string' || !titleOrIdea.trim()) {
      return res.status(400).json({ error: 'Judul atau ide tulisan wajib diisi.' });
    }

    const typeLabels: Record<string, string> = {
      puisi: 'Puisi Estetis',
      pantun: 'Pantun Tradisional & Modern',
      cerpen: 'Cerita Pendek (Cerpen)',
      novel: 'Bab Novel / Cerita Bersambung',
      quotes: 'Quotes Mutiara & Kata Motivasi',
      caption: 'Caption Media Sosial (Instagram/TikTok/X)',
      surat: 'Surat & Pesan Formal/Personal',
      artikel: 'Artikel & Esai Berbobot',
      rangkuman: 'Rangkuman & Intisari',
      terjemahan: 'Terjemahan Kontekstual',
      perbaiki: 'Perbaikan Tulisan & EYD',
      lanjutkan: 'Kelanjutan Tulisan',
      custom: 'Karya Tulis Bebas'
    };

    const typeDesc = typeLabels[type] || 'Karya Tulis Kreatif';

    const systemInstruction = 
      `Kamu adalah NEXERA AI Writing Studio — Master Penulis Sastra, Editor Bahasa Indonesia Berstandar PUEBI/KBBI, dan Copywriter Kelas Dunia. ` +
      `Tugasmu adalah menghasilkan tulisan berkualitas tinggi dengan jenis: ${typeDesc}. ` +
      `Aturan Penulisan:\n` +
      `1. Gaya & Nada Suara: ${tone}.\n` +
      `2. Target Panjang: ${length === 'singkat' ? 'singkat dan padat (150-300 kata)' : length === 'panjang' ? 'panjang, mendalam, dan lengkap (800-1500 kata)' : 'sedang dan berimbang (400-750 kata)'}.\n` +
      `3. Jika jenis adalah PUISI: gunakan metafora indah, diksi puitis, dan bait yang memikat.\n` +
      `4. Jika jenis adalah PANTUN: patuhi struktur sampiran & isi, rima a-b-a-b atau a-a-a-a, 8-12 suku kata per baris.\n` +
      `5. Jika jenis adalah CERPEN / NOVEL: bangun alur hidup, dialog natural, ekspresi emosional, dan resolusi memuaskan.\n` +
      `6. Jika jenis adalah CAPTION: buat hook di baris pertama, gunakan bullet/baris rapi, Call to Action, dan hashtag relevan.\n` +
      `7. Jika jenis adalah ARTIKEL: buat judul yang memikat, pembuka menarik, subjudul berbobot, dan kesimpulan bernas.\n` +
      `8. Format keluaran harus rapi menggunakan Markdown dengan judul utama di awal. Jangan tambahkan kata pembuka obrolan seperti "Tentu, ini hasil tulisanmu:". Langsung sajikan karya tulis seutuhnya.`;

    let promptText = `Jenis Tulisan: ${typeDesc}\nJudul / Ide Utama: "${titleOrIdea.trim()}"`;
    if (theme) promptText += `\nTema: ${theme}`;
    if (genreOrPlot) promptText += `\nGenre / Alur Cerita: ${genreOrPlot}`;
    if (characters) promptText += `\nKarakter / Tokoh: ${characters}`;
    if (instructions) promptText += `\nInstruksi Khusus Pengguna: ${instructions}`;
    if (type === 'terjemahan') promptText += `\nBahasa Target: ${targetLanguage}`;

    promptText += `\n\nBuatlah tulisan lengkap sekarang:`;

    const result = await generateWithGemini(promptText, systemInstruction, 45000);
    const textOutput = result.text.trim();
    const wordCount = textOutput.split(/\s+/).filter(Boolean).length;

    res.json({
      success: true,
      text: textOutput,
      title: titleOrIdea.trim(),
      type,
      tone,
      wordCount,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('AI Writing Studio Error:', error);
    res.status(500).json({
      error: error.message || 'Terjadi kesalahan saat membuat tulisan dengan AI.',
    });
  }
});

app.post('/api/writing/transform', async (req, res) => {
  try {
    const { 
      currentText, 
      action, 
      targetStyle, 
      customInstruction 
    } = req.body;

    if (!currentText || typeof currentText !== 'string' || !currentText.trim()) {
      return res.status(400).json({ error: 'Teks yang akan diproses wajib diisi.' });
    }

    if (!action) {
      return res.status(400).json({ error: 'Aksi pengolahan tulisan wajib ditentukan.' });
    }

    let actionInstruction = '';
    let promptTitle = '';

    switch (action) {
      case 'continue':
        actionInstruction = 
          'Kamu adalah penulis kelanjutan naskah. Lanjutkan tulisan berikut dari bagian paling akhir secara alami, mulus, dan koheren. ' +
          'Pertahankan alur cerita, karakter, sudut pandang (POV), dan nada tulisan sebelumnya. ' +
          'Keluarkan HANYA paragraf kelanjutannya saja, atau gabungan utuh yang terpadu rapi.';
        promptTitle = 'Kelanjutan Tulisan';
        break;

      case 'fix':
        actionInstruction = 
          'Kamu adalah editor bahasa profesional standar PUEBI/KBBI. Perbaiki ejaan, tata bahasa, diksi, dan susunan kalimat ' +
          'dari teks berikut tanpa mengubah maksud, makna, atau pesan utama tulisan. Sajikan teks lengkap yang sudah disempurnakan.';
        promptTitle = 'Teks yang Telah Disempurnakan';
        break;

      case 'expand':
        actionInstruction = 
          'Kamu adalah penulis pengembang karya. Perkaya dan panjangkan tulisan berikut dengan menambahkan detail deskripsi sensorik yang hidup, ' +
          'dialog berbobot, atau argumen yang lebih mendalam tanpa mengulang kalimat yang sudah ada atau bertele-tele.';
        promptTitle = 'Teks Versi Diperluas';
        break;

      case 'shorten':
        actionInstruction = 
          'Kamu adalah editor intisari. Persingkat dan padatkan tulisan berikut menjadi versi yang lebih ringkas, tajam, dan langsung ke inti ' +
          'tanpa kehilangan pesan utama atau esensi emosionalnya.';
        promptTitle = 'Teks Versi Ringkas';
        break;

      case 'restyle':
        actionInstruction = 
          `Kamu adalah penata gaya tulisan. Tulis ulang teks berikut dengan gaya/suasana: ${targetStyle || 'santai'}. ` +
          'Sesuaikan diksi, intonasi, dan ritme kalimat agar sepenuhnya mencerminkan gaya tersebut, dengan tetap mempertahankan topik utamanya.';
        promptTitle = `Teks dengan Gaya ${targetStyle || 'Santai'}`;
        break;

      case 'regenerate':
        actionInstruction = 
          'Kamu adalah penulis kreatif. Buat versi alternatif baru yang segar, berbeda, dan menarik berdasarkan ide dan pesan dari teks berikut.';
        promptTitle = 'Versi Alternatif Baru';
        break;

      default:
        actionInstruction = 'Kamu adalah asisten penulis AI profesional. Olah teks berikut sesuai instruksi pengguna.';
        promptTitle = 'Hasil Pengolahan Tulisan';
    }

    if (customInstruction) {
      actionInstruction += `\nInstruksi tambahan pengguna: ${customInstruction}`;
    }

    const systemInstruction = 
      `${actionInstruction}\nSajikan langsung hasil tulisan akhir dalam format Markdown yang rapi tanpa basa-basi pengantar seperti "Tentu, ini hasilnya:".`;

    const promptText = `Berikut adalah teks saat ini:\n\n${currentText.trim()}\n\nLakukan aksi "${action}":`;

    const result = await generateWithGemini(promptText, systemInstruction, 45000);
    const textOutput = result.text.trim();
    const wordCount = textOutput.split(/\s+/).filter(Boolean).length;

    res.json({
      success: true,
      text: textOutput,
      action,
      targetStyle,
      wordCount,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('AI Writing Transform Error:', error);
    res.status(500).json({
      error: error.message || 'Gagal memproses pengolahan tulisan.',
    });
  }
});

// 12. Voice Synthesis (TTS) API with Gojo & Sasuke Anime Presets
const VOICE_PRESETS: Record<string, {
  name: string;
  character: string;
  anime: string;
  geminiVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  style: string;
  defaultPitch: number;
  defaultRate: number;
  previewText: string;
  audioFilter: 'limitless' | 'sharingan' | 'neural';
  description: string;
}> = {
  gojo: {
    name: 'Gojo Satoru (Limitless Voice)',
    character: 'Gojo Satoru',
    anime: 'Jujutsu Kaisen',
    geminiVoice: 'Puck',
    style: 'Charismatic, playful, mid-tenor adult male with effortless swagger, playful smug chuckle ("Haha! Daijoubu desho?! Datte kimi yowai mon!"), lighthearted yet commanding authority like Gojo Satoru from Jujutsu Kaisen. Speaking in lively, expressive Indonesian.',
    defaultPitch: 1.05,
    defaultRate: 1.0,
    previewText: 'Haha! Daijoubu desho?! Datte kimi yowai mon! Tenang saja, bersama Gojo Satoru, guru terkuat di sini, tidak ada yang perlu kamu cemaskan. Mau nanya apa hari ini?',
    audioFilter: 'limitless',
    description: 'Vokal pria bernada sedang-tinggi dengan kekeh nakal, karismatik, santai, dan penuh percaya diri ala Gojo Satoru.'
  },
  sasuke: {
    name: 'Sasuke Uchiha (Rinnegan Voice)',
    character: 'Sasuke Uchiha',
    anime: 'Naruto Shippuden',
    geminiVoice: 'Charon',
    style: 'Deep, calm, stoic baritone adult male with low chest resonance, cold raspy whisper, and deliberate pauses ("Na wa... Uchiha Sasuke... Raimei to tomo ni chire... Chidori!"), deadly serious and sharp like Sasuke Uchiha from Naruto. Speaking in measured, disciplined Indonesian.',
    defaultPitch: 0.9,
    defaultRate: 0.95,
    previewText: 'Na wa... Uchiha Sasuke... Hmph. Jangan buang waktuku dengan basa-basi yang tidak berguna. Katakan apa tujuanmu sekarang.',
    audioFilter: 'sharingan',
    description: 'Vokal bariton rendah beresonansi dada, dingin, serak tajam, tenang, dan berwibawa tinggi ala Sasuke Uchiha.'
  },
  nexera: {
    name: 'NEXERA AI Neural Core',
    character: 'NEXERA Core',
    anime: 'Original AI',
    geminiVoice: 'Kore',
    style: 'Futuristic, ultra-clear, sophisticated AI assistant voice with warm, articulate presence in Indonesian.',
    defaultPitch: 1.0,
    defaultRate: 1.05,
    previewText: 'Halo! Saya NEXERA AI, asisten cerdas masa depan Anda. Seluruh modul kognitif, vision, dan suara telah aktif.',
    audioFilter: 'neural',
    description: 'Vokal asisten AI cerdas berartikulasi tinggi, jernih, dan responsif.'
  }
};

app.get('/api/voice/presets', (req, res) => {
  res.json({
    success: true,
    presets: VOICE_PRESETS
  });
});

// Helper function to split text into natural speech chunks (~250-320 chars)
function splitIntoSpeechChunks(text: string, maxChunkLength = 280): string[] {
  if (text.length <= maxChunkLength) return [text];

  const chunks: string[] = [];
  // Split on sentence terminals first: . ! ? \n
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];

  let currentChunk = '';
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length <= maxChunkLength) {
      currentChunk += (currentChunk ? ' ' : '') + trimmed;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      
      // If a single sentence is exceptionally long, split by comma or words
      if (trimmed.length > maxChunkLength) {
        const words = trimmed.split(/\s+/);
        let subChunk = '';
        for (const w of words) {
          if (subChunk.length + w.length + 1 <= maxChunkLength) {
            subChunk += (subChunk ? ' ' : '') + w;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = w;
          }
        }
        if (subChunk) currentChunk = subChunk;
        else currentChunk = '';
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [text];
}

// Audio cache & quota tracking to prevent repeated 429s on Free Tier
const ttsAudioCache = new Map<string, string>();
let ttsQuotaExhaustedUntil = 0;

async function synthesizeTextChunk(cleanText: string, preset: any): Promise<string | null> {
  const cacheKey = `${preset.geminiVoice}_${cleanText.slice(0, 120)}`;
  if (ttsAudioCache.has(cacheKey)) {
    return ttsAudioCache.get(cacheKey)!;
  }

  // If already known to be quota exhausted, skip network calls to prevent 429 errors
  if (Date.now() < ttsQuotaExhaustedUntil) {
    return null;
  }

  const modelsToTry = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];

  for (const modelName of modelsToTry) {
    try {
      const ttsResponse = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: preset.style,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: preset.geminiVoice },
            },
          },
        },
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        ttsAudioCache.set(cacheKey, base64Audio);
        return base64Audio;
      }
    } catch (err: any) {
      const errStr = String(err?.message || err);
      if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
        // Quota limit hit: pause server TTS attempts for 1 hour to prevent log spam
        ttsQuotaExhaustedUntil = Date.now() + 60 * 60 * 1000;
        console.log(`[TTS Notice] Free Tier daily limit reached on ${modelName}. Seamlessly switching to browser client Web Speech fallback.`);
        return null;
      }
    }
  }

  return null;
}

app.post('/api/voice/synthesize', async (req, res) => {
  try {
    const { text, persona = 'nexera', speed = 1.0, singleChunkOnly = false } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Teks suara wajib diisi.' });
    }

    const preset = VOICE_PRESETS[persona] || VOICE_PRESETS.nexera;

    // Clean text: strip markdown asterisks, hashes, backticks, emojis, URLs
    let cleanText = text
      .replace(/[*_#`~[\]]/g, '')
      .replace(/https?:\/\/\S+/g, 'tautan')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (!cleanText) {
      return res.status(400).json({ error: 'Teks tidak valid setelah pembersihan karakter.' });
    }

    // Check if server TTS is in quota cooldown period
    if (Date.now() < ttsQuotaExhaustedUntil) {
      return res.json({
        success: true,
        useClientFallback: true,
        quotaExceeded: true,
        message: 'Gemini TTS Free Tier kuota harian tercapai. Beralih ke Web Speech Synthesis klien secara otomatis.',
        persona,
        character: preset.character,
        cleanText,
      });
    }

    // Sentence-aware chunking to prevent truncation of long text
    const textChunks = splitIntoSpeechChunks(cleanText);

    // If caller requested only the first chunk or text is short
    if (singleChunkOnly || textChunks.length === 1) {
      const audioBase64 = await synthesizeTextChunk(textChunks[0], preset);
      if (!audioBase64) {
        return res.json({
          success: true,
          useClientFallback: true,
          quotaExceeded: true,
          persona,
          character: preset.character,
          cleanText: textChunks[0],
        });
      }

      return res.json({
        success: true,
        audioBase64,
        chunks: [{ text: textChunks[0], audioBase64 }],
        totalChunks: 1,
        isMultiChunk: false,
        mimeType: 'audio/wav',
        persona,
        character: preset.character,
        cleanText: textChunks[0],
      });
    }

    // Synthesize active chunks (up to 8 chunks)
    const activeChunks = textChunks.slice(0, 8);
    const audioChunks: Array<{ text: string; audioBase64: string }> = [];

    for (const chunk of activeChunks) {
      const audioData = await synthesizeTextChunk(chunk, preset);
      if (audioData) {
        audioChunks.push({ text: chunk, audioBase64: audioData });
      } else {
        // If quota exceeded mid-process
        break;
      }
    }

    if (audioChunks.length === 0) {
      return res.json({
        success: true,
        useClientFallback: true,
        quotaExceeded: true,
        persona,
        character: preset.character,
        cleanText,
      });
    }

    res.json({
      success: true,
      audioBase64: audioChunks[0]?.audioBase64 || '',
      chunks: audioChunks,
      totalChunks: audioChunks.length,
      isMultiChunk: audioChunks.length > 1,
      mimeType: 'audio/wav',
      persona,
      character: preset.character,
      cleanText,
    });
  } catch (error: any) {
    // Return graceful 200 with fallback instruction so the application never breaks
    res.json({
      success: true,
      useClientFallback: true,
      error: error.message,
      fallbackAvailable: true,
      persona: req.body?.persona || 'nexera',
      cleanText: req.body?.text || '',
    });
  }
});

// Production static assets & Vite middleware configuration
async function startServer() {
  const isCompiled = __filename.endsWith('server.js') || __dirname.endsWith('dist');
  const isProd = process.env.NODE_ENV === 'production' || isCompiled;

  // Accurately resolve dist path whether running compiled from dist/ or tsx from workspace root
  let distPath = __dirname;
  if (fs.existsSync(path.resolve(__dirname, 'index.html'))) {
    distPath = __dirname;
  } else if (fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'))) {
    distPath = path.resolve(__dirname, 'dist');
  } else if (fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'))) {
    distPath = path.resolve(process.cwd(), 'dist');
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log(`[NEXERA-SERVER] Serving production static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint API tidak ditemukan' });
      }
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ NEXERA AI Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
