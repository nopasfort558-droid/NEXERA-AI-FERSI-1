import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings2, 
  RotateCcw, 
  Sparkles, 
  Radio, 
  AlertCircle, 
  Send,
  Sliders,
  ChevronDown,
  Info,
  Zap,
  Flame,
  Bot,
  Play,
  Pause,
  Square,
  Activity,
  Headphones,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AIMemoryItem } from '../types';
import { 
  playClickSound, 
  playSuccessSound, 
  playErrorSound, 
  playGojoSound, 
  playSasukeSound,
  synthesizeAndPlayVoice,
  stopCurrentVoiceAudio,
  pauseCurrentVoiceAudio,
  resumeCurrentVoiceAudio,
  replayCurrentVoiceAudio,
  VoicePlaybackState
} from '../utils/audio';

type VoiceState = 'idle' | 'listening' | 'processing' | 'generating' | 'speaking' | 'paused' | 'completed' | 'error';

interface VoiceMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  persona?: 'nexera' | 'gojo' | 'sasuke';
}

interface VoicePresetDetail {
  id: 'gojo' | 'sasuke' | 'nexera';
  name: string;
  character: string;
  anime: string;
  tag: string;
  badgeColor: string;
  borderColor: string;
  glowColor: string;
  bgGradient: string;
  vocalDescription: string;
  previewSample: string;
  geminiVoice: string;
}

const PRESET_DETAILS: Record<'gojo' | 'sasuke' | 'nexera', VoicePresetDetail> = {
  gojo: {
    id: 'gojo',
    name: 'Gojo Satoru (Limitless Voice)',
    character: 'Gojo Satoru',
    anime: 'Jujutsu Kaisen',
    tag: 'LIMITLESS • SAIKYOU',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    borderColor: 'border-cyan-500/50 hover:border-cyan-400',
    glowColor: 'shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    bgGradient: 'from-cyan-950/40 via-blue-950/30 to-slate-900/80',
    vocalDescription: 'Vokal pria bernada sedang-tinggi (mid-tenor) dengan kekeh nakal/smug, karismatik, santai, penuh percaya diri ("Haha! Daijoubu desho?! Datte kimi yowai mon!").',
    previewSample: 'Haha! Daijoubu desho?! Datte kimi yowai mon! Tenang saja, bersama Gojo Satoru, guru terkuat di sini, tidak ada yang perlu kamu cemaskan. Mau nanya apa hari ini?',
    geminiVoice: 'Puck (Charismatic & Swagger)'
  },
  sasuke: {
    id: 'sasuke',
    name: 'Sasuke Uchiha (Rinnegan Voice)',
    character: 'Sasuke Uchiha',
    anime: 'Naruto Shippuden',
    tag: 'RINNEGAN • CHIDORI',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
    borderColor: 'border-purple-500/50 hover:border-purple-400',
    glowColor: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    bgGradient: 'from-purple-950/40 via-indigo-950/30 to-slate-900/80',
    vocalDescription: 'Vokal bariton rendah (deep baritone) beresonansi dada, dingin, serak tajam, tenang, jeda terukur ("Na wa... Uchiha Sasuke... Raimei to tomo ni chire... Chidori!").',
    previewSample: 'Na wa... Uchiha Sasuke... Raimei to tomo ni chire... Chidori! Hmph. Jangan buang waktuku dengan basa-basi yang tidak berguna. Katakan apa tujuanmu sekarang.',
    geminiVoice: 'Charon (Deep & Stoic Resonance)'
  },
  nexera: {
    id: 'nexera',
    name: 'NEXERA AI Neural Core',
    character: 'NEXERA Core',
    anime: 'Cyberpunk Original',
    tag: 'NEURAL CORE • DEFAULT',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
    borderColor: 'border-blue-500/50 hover:border-blue-400',
    glowColor: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    bgGradient: 'from-blue-950/40 via-slate-900/60 to-slate-900/80',
    vocalDescription: 'Suara asisten AI cerdas berartikulasi tinggi, jernih, modern, dan futuristik untuk pendampingan percakapan harian.',
    previewSample: 'Halo! Saya NEXERA AI, asisten cerdas masa depan Anda. Seluruh modul kognitif, vision, dan suara telah aktif.',
    geminiVoice: 'Kore (Articulate AI Assistant)'
  }
};

export const VoiceTab: React.FC = () => {
  const { user } = useAuth();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Voice Persona: gojo, sasuke, or nexera
  const [persona, setPersona] = useState<'gojo' | 'sasuke' | 'nexera'>('gojo');
  
  // Audio playback preview state
  const [previewingPersona, setPreviewingPersona] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number; text: string }>({
    current: 1,
    total: 1,
    text: '',
  });
  const [lastSpokenText, setLastSpokenText] = useState<string>(PRESET_DETAILS.gojo.previewSample);

  // Conversation history
  const [conversation, setConversation] = useState<VoiceMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      persona: 'gojo',
      text: `Yo ${user.name}! Gojo Satoru di sini. Aku sudah mengaktifkan teknologi Voice Synthesis AI. Kamu bisa memilih suaraku atau suara Sasuke di atas, lalu tekan tombol mikrofon di bawah untuk berbicara langsung!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // TTS Settings
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [useStudioTTS, setUseStudioTTS] = useState(true);

  // Manual fallback input
  const [manualInput, setManualInput] = useState('');

  // Refs
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onstart = () => {
        setVoiceState('listening');
        setPermissionError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setPermissionError('Izin mikrofon ditolak oleh browser/perangkat. Silakan izinkan akses mikrofon di pengaturan browser Anda agar dapat berbicara langsung.');
        } else if (event.error !== 'no-speech') {
          setPermissionError(`Catatan mikrofon: ${event.error}`);
        }
        setVoiceState('idle');
      };

      recognition.onend = () => {
        setVoiceState((prev) => {
          if (prev === 'listening') return 'idle';
          return prev;
        });
      };

      recognitionRef.current = recognition;
    } catch (e: any) {
      console.error('Failed to init speech recognition:', e);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      stopCurrentVoiceAudio();
    };
  }, []);

  // When listening ends and we have transcript, send query
  useEffect(() => {
    if (voiceState === 'idle' && transcript.trim().length > 0) {
      const query = transcript.trim();
      setTranscript('');
      handleSendQuery(query);
    }
  }, [voiceState, transcript]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const startListening = () => {
    playClickSound();
    stopCurrentVoiceAudio();
    setPermissionError(null);

    if (!isSupported || !recognitionRef.current) {
      setPermissionError('Browser Anda belum mendukung input suara mikrofon secara langsung. Anda dapat menggunakan kolom teks di bawah.');
      return;
    }

    try {
      setTranscript('');
      recognitionRef.current.start();
    } catch (err: any) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.start();
        }, 150);
      } catch (e: any) {
        setPermissionError('Tidak dapat mengakses mikrofon: ' + (e?.message || 'Error'));
      }
    }
  };

  const stopListening = () => {
    playClickSound();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  const stopSpeaking = () => {
    playClickSound();
    stopCurrentVoiceAudio();
    setVoiceState('idle');
    setPreviewingPersona(null);
  };

  const handlePause = () => {
    playClickSound();
    pauseCurrentVoiceAudio();
    setVoiceState('paused');
  };

  const handleResume = () => {
    playClickSound();
    resumeCurrentVoiceAudio();
    setVoiceState('speaking');
  };

  const handleReplay = () => {
    playClickSound();
    if (persona === 'gojo') playGojoSound();
    else if (persona === 'sasuke') playSasukeSound();
    replayCurrentVoiceAudio();
    setVoiceState('speaking');
  };

  // Play voice preview for a specific persona
  const handlePlayPreview = async (targetPersona: 'gojo' | 'sasuke' | 'nexera') => {
    if (previewingPersona === targetPersona && (voiceState === 'speaking' || voiceState === 'paused')) {
      stopSpeaking();
      return;
    }

    if (targetPersona === 'gojo') playGojoSound();
    else if (targetPersona === 'sasuke') playSasukeSound();
    else playClickSound();

    stopCurrentVoiceAudio();
    setPreviewingPersona(targetPersona);
    setVoiceState('generating');

    const sampleText = PRESET_DETAILS[targetPersona].previewSample;
    setLastSpokenText(sampleText);
    setChunkProgress({ current: 1, total: 1, text: sampleText });

    await synthesizeAndPlayVoice(sampleText, targetPersona, {
      onStart: () => {
        setVoiceState('speaking');
        setPreviewingPersona(targetPersona);
      },
      onStateChange: (st) => {
        setVoiceState(st);
        if (st === 'idle' || st === 'completed' || st === 'error') {
          setPreviewingPersona(null);
        }
      },
      onProgress: (cur, tot, txt) => {
        setChunkProgress({ current: cur, total: tot, text: txt });
      },
      onEnd: () => {
        setVoiceState('completed');
        setPreviewingPersona(null);
      },
      onError: () => {
        setVoiceState('error');
        setPreviewingPersona(null);
      }
    });
  };

  // Speak AI text using Gemini Studio Voice with automatic fallback
  const speakAIResponse = async (text: string, currentPersona: 'gojo' | 'sasuke' | 'nexera') => {
    if (!autoSpeak) return;

    setVoiceState('generating');
    setIsSynthesizing(true);
    setLastSpokenText(text);

    await synthesizeAndPlayVoice(text, currentPersona, {
      onStart: () => {
        setVoiceState('speaking');
        setIsSynthesizing(false);
      },
      onStateChange: (st) => {
        setVoiceState(st);
        if (st !== 'generating') {
          setIsSynthesizing(false);
        }
      },
      onProgress: (cur, tot, txt) => {
        setChunkProgress({ current: cur, total: tot, text: txt });
      },
      onEnd: () => {
        setVoiceState('completed');
        setIsSynthesizing(false);
      },
      onError: () => {
        setVoiceState('error');
        setIsSynthesizing(false);
      }
    });
  };

  // Send query to AI backend
  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: VoiceMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversation(prev => [...prev, userMsg]);
    setVoiceState('processing');

    // Retrieve active memories
    let activeMemories: string[] = [];
    try {
      const stored = localStorage.getItem('nexera_ai_memories_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.enabled !== false && Array.isArray(parsed.items)) {
          activeMemories = parsed.items
            .filter((m: AIMemoryItem) => m.enabled)
            .map((m: AIMemoryItem) => m.fact);
        }
      }
    } catch {}

    // Precise persona instruction matching anime vocal and behavioral traits
    let personaInstruction = '';
    if (persona === 'gojo') {
      personaInstruction = 
        'Kamu adalah Gojo Satoru dari anime Jujutsu Kaisen. ' +
        'Karakteristik: Pria dewasa paling kuat, santai, percaya diri tinggi (confident swagger), cool, ceria, dan sedikit jahil/playful dengan muridnya. ' +
        'Bicaralah dalam Bahasa Indonesia yang santai, gunakan sapaan seperti "Yo!", "Daijoubu", atau nada percaya diri yang ramah. ' +
        'Jawab singkat, padat, dan ekspresif (maksimal 2-3 kalimat) agar suara terdengar sangat alami layaknya percakapan anime langsung.';
    } else if (persona === 'sasuke') {
      personaInstruction = 
        'Kamu adalah Sasuke Uchiha dari anime Naruto Shippuden. ' +
        'Karakteristik: Pria dewasa dengan pembawaan dingin, tenang, to the point, berwibawa tinggi, tajam, dan tidak suka basa-basi yang berbelit-belit. ' +
        'Bicaralah dalam Bahasa Indonesia dengan nada tenang, lugas, terkadang gunakan jeda khas "...Hmph" atau ketenangan seorang Uchiha. ' +
        'Jawab singkat, padat, dan berbobot (maksimal 2-3 kalimat) agar intonasi suaramu terdengar dingin dan berkarisma.';
    } else {
      personaInstruction = 
        `Kamu adalah NEXERA Voice AI Assistant untuk ${user.name}. ` +
        'Bicaralah dengan suara yang ramah, ringkas, jelas, dan futuristik dalam bahasa Indonesia (maksimal 2-3 kalimat).';
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          persona: persona,
          customSystemInstruction: personaInstruction,
          memories: activeMemories,
          history: conversation.slice(-4).map(c => ({
            role: c.sender === 'user' ? 'user' : 'assistant',
            parts: [{ text: c.text }]
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memproses respon suara');
      }

      const aiReply = data.text || 'Maaf, aku tidak dapat mendengar dengan jelas. Bisa kamu ulangi?';
      
      const aiMsg: VoiceMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        persona: persona,
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversation(prev => [...prev, aiMsg]);
      playSuccessSound();

      // Trigger Voice Synthesis
      speakAIResponse(aiReply, persona);

    } catch (err: any) {
      playErrorSound();
      const errorMsg: VoiceMessage = {
        id: 'error-' + Date.now(),
        sender: 'ai',
        persona: persona,
        text: `Maaf ada kendala koneksi: ${err.message || 'Server sibuk'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversation(prev => [...prev, errorMsg]);
      setVoiceState('idle');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const txt = manualInput;
    setManualInput('');
    handleSendQuery(txt);
  };

  const quickPrompts = [
    { label: 'Yo Gojo, siapa yang terkuat di dunia jujutsu?', personaTarget: 'gojo' },
    { label: 'Gojo, bagaimana cara kerja Limitless dan Hollow Purple?', personaTarget: 'gojo' },
    { label: 'Sasuke, apa filosofi dan kekuatan mata Rinnegan?', personaTarget: 'sasuke' },
    { label: 'Sasuke, bagaimana kamu melatih jurus Chidori?', personaTarget: 'sasuke' },
    { label: 'NEXERA, analisis status sistem hari ini.', personaTarget: 'nexera' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#081026]/90 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide font-orbitron">
              AI VOICE ASSISTANT
            </h1>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40">
              STUDIO NEURAL TTS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Bicara dengan mikrofon HP dan dengarkan vokal anime autentik <strong className="text-cyan-300">Gojo Satoru</strong> & <strong className="text-purple-300">Sasuke Uchiha</strong> dalam Bahasa Indonesia.
          </p>
        </div>

        {/* Global Settings toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => { playClickSound(); setShowSettings(!showSettings); }}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              showSettings 
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Pengaturan Suara"
          >
            <Settings2 className="w-4 h-4" />
            <span>Pengaturan</span>
          </button>
        </div>
      </div>

      {/* ANIME VOICE PRESETS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Headphones className="w-4 h-4 text-cyan-400" />
            <span>Pilihan Karakter Suara AI (Preset Studio)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Pilih karakter aktif & uji suara dengan tombol preview
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: GOJO SATORU */}
          <div 
            className={`relative p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between ${
              persona === 'gojo'
                ? 'bg-gradient-to-br from-cyan-950/60 via-blue-950/40 to-slate-900/90 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.35)] scale-[1.01]'
                : 'bg-[#081026]/80 border-slate-800 hover:border-cyan-500/40 opacity-90'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      Gojo Satoru
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-400/30">
                        Jujutsu Kaisen
                      </span>
                    </h3>
                    <p className="text-[11px] text-cyan-400 font-mono">Limitless • Six Eyes Voice</p>
                  </div>
                </div>

                {persona === 'gojo' && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-cyan-500 text-black font-extrabold uppercase tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                    Suara Aktif
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {PRESET_DETAILS.gojo.vocalDescription}
              </p>

              <div className="p-2.5 rounded-xl bg-black/40 border border-cyan-500/20 text-[11px] text-cyan-200 italic">
                "{PRESET_DETAILS.gojo.previewSample}"
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
              <button
                onClick={() => handlePlayPreview('gojo')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  previewingPersona === 'gojo'
                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {previewingPersona === 'gojo' ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Hentikan Preview</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                    <span>Dengarkan Suara Gojo</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  playGojoSound();
                  setPersona('gojo');
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  persona === 'gojo'
                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {persona === 'gojo' ? 'Dipilih' : 'Gunakan Suara Ini'}
              </button>
            </div>
          </div>

          {/* Card 2: SASUKE UCHIHA */}
          <div 
            className={`relative p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between ${
              persona === 'sasuke'
                ? 'bg-gradient-to-br from-purple-950/60 via-indigo-950/40 to-slate-900/90 border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.35)] scale-[1.01]'
                : 'bg-[#081026]/80 border-slate-800 hover:border-purple-500/40 opacity-90'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(168,85,247,0.6)]">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      Sasuke Uchiha
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-400/30">
                        Naruto Shippuden
                      </span>
                    </h3>
                    <p className="text-[11px] text-purple-400 font-mono">Rinnegan • Chidori Voice</p>
                  </div>
                </div>

                {persona === 'sasuke' && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500 text-white font-extrabold uppercase tracking-wider shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                    Suara Aktif
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {PRESET_DETAILS.sasuke.vocalDescription}
              </p>

              <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/20 text-[11px] text-purple-200 italic">
                "{PRESET_DETAILS.sasuke.previewSample}"
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
              <button
                onClick={() => handlePlayPreview('sasuke')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  previewingPersona === 'sasuke'
                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
                    : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                }`}
              >
                {previewingPersona === 'sasuke' ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Hentikan Preview</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-purple-400 text-purple-400" />
                    <span>Dengarkan Suara Sasuke</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  playSasukeSound();
                  setPersona('sasuke');
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  persona === 'sasuke'
                    ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {persona === 'sasuke' ? 'Dipilih' : 'Gunakan Suara Ini'}
              </button>
            </div>
          </div>
        </div>

        {/* Option 3: NEXERA Core Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-semibold">Preset Tambahan: NEXERA AI Neural Core</span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">(Suara asisten cerdas standar)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePlayPreview('nexera')}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-cyan-400" /> Preview
            </button>
            <button
              onClick={() => {
                playClickSound();
                setPersona('nexera');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                persona === 'nexera'
                  ? 'bg-cyan-500 text-black'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {persona === 'nexera' ? 'Aktif' : 'Pilih'}
            </button>
          </div>
        </div>
      </div>

      {/* Permission or compatibility banner */}
      {permissionError && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-3 text-amber-200 text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-300">Pemberitahuan Izin Mikrofon:</p>
            <p className="mt-0.5">{permissionError}</p>
          </div>
        </div>
      )}

      {/* Collapsible Voice Settings */}
      {showSettings && (
        <div className="p-5 rounded-3xl bg-[#081026] border border-cyan-500/20 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold">
              <Sliders className="w-4 h-4" />
              <span>Pengaturan Sintesis Suara AI (Studio Engine)</span>
            </div>
            <button
              onClick={() => {
                setSpeechRate(1.0);
                setSpeechPitch(1.0);
                setUseStudioTTS(true);
              }}
              className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Standar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Auto speak toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Bicara Otomatis</p>
                <p className="text-[10px] text-slate-400">Bacakan jawaban AI setelah berpikir</p>
              </div>
              <button
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  autoSpeak ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    autoSpeak ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* High fidelity Studio TTS */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Gemini Studio TTS (24kHz)</p>
                <p className="text-[10px] text-cyan-400">Vokal studio anime autentik</p>
              </div>
              <button
                onClick={() => setUseStudioTTS(!useStudioTTS)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  useStudioTTS ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    useStudioTTS ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Speech Rate */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Kecepatan Suara</span>
                <span className="text-cyan-400 font-mono font-bold">{speechRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Voice Interactive Arena */}
      <div className={`relative p-6 sm:p-10 rounded-3xl border overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 ${
        persona === 'gojo'
          ? 'bg-gradient-to-b from-[#061433] via-[#040d22] to-[#020712] border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.15)]'
          : persona === 'sasuke'
          ? 'bg-gradient-to-b from-[#150a29] via-[#0c051a] to-[#020712] border-purple-500/40 shadow-[0_0_60px_rgba(168,85,247,0.15)]'
          : 'bg-gradient-to-b from-[#08122c] via-[#050c1f] to-[#030612] border-blue-500/40 shadow-[0_0_60px_rgba(59,130,246,0.15)]'
      }`}>
        {/* Animated Background Aura */}
        <div className="absolute w-[450px] h-[450px] rounded-full border border-cyan-500/10 pointer-events-none animate-pulse" />
        <div className="absolute w-[600px] h-[600px] rounded-full border border-purple-500/10 pointer-events-none" />

        {/* Current Active Persona & Status Badge */}
        <div className="mb-4 z-10 flex flex-wrap items-center justify-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${PRESET_DETAILS[persona].badgeColor}`}>
            {persona === 'gojo' ? <Zap className="w-3.5 h-3.5" /> : persona === 'sasuke' ? <Flame className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            Suara Aktif: {PRESET_DETAILS[persona].name}
          </span>

          {voiceState === 'idle' && (
            <span className="px-3.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-semibold">
              Standby: Siap Mendengarkan
            </span>
          )}
          {voiceState === 'listening' && (
            <span className="px-3.5 py-1 rounded-full bg-red-500/20 border border-red-500/60 text-red-300 text-xs font-semibold animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Mendengarkan ucapan Anda...
            </span>
          )}
          {voiceState === 'processing' && (
            <span className="px-3.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/60 text-cyan-300 text-xs font-semibold animate-pulse flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              Memproses & Menyintesis Vokal...
            </span>
          )}
          {voiceState === 'speaking' && (
            <span className="px-3.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/60 text-purple-300 text-xs font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400 animate-bounce" />
              AI sedang berbicara ({PRESET_DETAILS[persona].character})...
            </span>
          )}
        </div>

        {/* Central Futuristic Voice Orb Button */}
        <div className="relative z-10 my-4">
          {/* Animated Wave Rings when listening or speaking */}
          {(voiceState === 'listening' || voiceState === 'speaking') && (
            <>
              <div className="absolute -inset-4 rounded-full border-2 border-cyan-400/30 animate-ping pointer-events-none" />
              <div className="absolute -inset-8 rounded-full border border-purple-400/20 animate-pulse pointer-events-none" />
            </>
          )}

          <button
            onClick={voiceState === 'listening' ? stopListening : voiceState === 'speaking' ? stopSpeaking : startListening}
            className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer ${
              voiceState === 'listening'
                ? 'bg-gradient-to-tr from-red-600 to-rose-400 shadow-[0_0_50px_rgba(239,68,68,0.7)] scale-105'
                : voiceState === 'speaking'
                ? persona === 'sasuke'
                  ? 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-pink-500 shadow-[0_0_50px_rgba(168,85,247,0.7)] animate-pulse'
                  : 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-purple-600 shadow-[0_0_50px_rgba(6,182,212,0.7)] animate-pulse'
                : voiceState === 'processing'
                ? 'bg-gradient-to-tr from-blue-700 to-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.6)] animate-spin-slow'
                : persona === 'sasuke'
                ? 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-slate-900 hover:shadow-[0_0_45px_rgba(168,85,247,0.6)] hover:scale-105'
                : 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 hover:shadow-[0_0_45px_rgba(6,182,212,0.6)] hover:scale-105'
            }`}
          >
            {voiceState === 'listening' ? (
              <>
                <MicOff className="w-10 h-10 text-white" />
                <span className="text-[11px] font-bold text-white mt-1">Selesai Bicara</span>
              </>
            ) : voiceState === 'speaking' ? (
              <>
                <VolumeX className="w-10 h-10 text-white" />
                <span className="text-[11px] font-bold text-white mt-1">Heningkan</span>
              </>
            ) : voiceState === 'processing' ? (
              <>
                <Sparkles className="w-10 h-10 text-white animate-spin" />
                <span className="text-[11px] font-bold text-white mt-1">Sintesis...</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 text-white" />
                <span className="text-[11px] font-bold text-white mt-1">Mulai Bicara</span>
              </>
            )}
          </button>
        </div>

        {/* Live Audio Visualizer Equalizer Waves when speaking or listening */}
        {(voiceState === 'speaking' || voiceState === 'listening') && (
          <div className="flex items-center justify-center gap-1.5 my-2 z-10">
            {[40, 75, 55, 95, 60, 85, 45, 100, 70, 50, 80, 60].map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-full animate-pulse transition-all ${
                  persona === 'sasuke' ? 'bg-purple-400' : 'bg-cyan-400'
                }`}
                style={{
                  height: `${h * 0.3}px`,
                  animationDuration: `${0.3 + (i % 4) * 0.2}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Live speech transcription display */}
        <div className="w-full max-w-lg mt-3 min-h-[48px] z-10">
          {transcript ? (
            <p className="text-cyan-300 font-medium text-sm sm:text-base italic animate-pulse bg-cyan-950/40 p-3 rounded-2xl border border-cyan-500/30">
              "{transcript}"
            </p>
          ) : voiceState === 'listening' ? (
            <p className="text-slate-400 text-xs sm:text-sm animate-pulse">
              Silakan ucapkan kalimat atau pertanyaan Anda ke mikrofon...
            </p>
          ) : (
            <p className="text-slate-400 text-xs">
              Tekan tombol mikrofon di atas untuk berbicara langsung dengan {PRESET_DETAILS[persona].character}
            </p>
          )}
        </div>

        {/* Universal Audio Player Control Deck */}
        <div className="w-full max-w-md mt-4 p-3 rounded-2xl bg-black/60 border border-slate-800 backdrop-blur-md z-10 flex flex-col gap-2">
          {/* Header State & Chunk Badge */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                voiceState === 'speaking' ? 'bg-emerald-400 animate-ping' :
                voiceState === 'generating' ? 'bg-cyan-400 animate-spin' :
                voiceState === 'paused' ? 'bg-amber-400' :
                voiceState === 'error' ? 'bg-red-400' : 'bg-slate-500'
              }`} />
              <span className="font-mono text-[11px] text-slate-300">
                {voiceState === 'speaking' ? 'Sedang Berbicara' :
                 voiceState === 'generating' ? 'Menyintesis Vokal AI...' :
                 voiceState === 'paused' ? 'Jeda Sementara' :
                 voiceState === 'completed' ? 'Pemutaran Selesai' :
                 voiceState === 'error' ? 'Gagal Memutar Audio' :
                 'Pemutar Suara Siap'}
              </span>
            </div>

            {chunkProgress.total > 1 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 font-mono border border-cyan-500/30">
                Bagian {chunkProgress.current} dari {chunkProgress.total}
              </span>
            )}
          </div>

          {/* Active chunk excerpt if playing or paused */}
          {chunkProgress.text && (voiceState === 'speaking' || voiceState === 'paused') && (
            <p className="text-[11px] text-slate-400 italic line-clamp-1 px-1">
              "{chunkProgress.text}"
            </p>
          )}

          {/* Player Buttons: Play/Resume, Pause, Stop, Replay */}
          <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-800/80">
            {voiceState === 'paused' ? (
              <button
                type="button"
                onClick={handleResume}
                className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                title="Lanjutkan Pemutaran"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Lanjutkan</span>
              </button>
            ) : voiceState === 'speaking' ? (
              <button
                type="button"
                onClick={handlePause}
                className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                title="Jeda Sementara"
              >
                <Pause className="w-3.5 h-3.5 fill-black" />
                <span>Jeda</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handlePlayPreview(persona)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  persona === 'sasuke' 
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                }`}
                title="Putar Sampel Suara"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Putar Suara</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReplay}
              disabled={!lastSpokenText}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              title="Putar Ulang dari Awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulangi</span>
            </button>

            <button
              type="button"
              onClick={stopSpeaking}
              disabled={voiceState === 'idle'}
              className="py-1.5 px-3 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 disabled:opacity-30 disabled:cursor-not-allowed text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Hentikan Audio"
            >
              <Square className="w-3.5 h-3.5 fill-red-400" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Anime Prompts */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Contoh Pertanyaan Percakapan Karakter:</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                playClickSound();
                if (p.personaTarget !== persona) {
                  setPersona(p.personaTarget as any);
                }
                handleSendQuery(p.label);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                p.personaTarget === 'gojo' ? 'bg-cyan-950 text-cyan-300' : p.personaTarget === 'sasuke' ? 'bg-purple-950 text-purple-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {p.personaTarget.toUpperCase()}
              </span>
              <span>"{p.label}"</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation History Log */}
      <div className="p-5 rounded-3xl bg-[#081026] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Riwayat Percakapan Suara</span>
          </div>
          <button
            onClick={() => {
              playClickSound();
              setConversation([]);
            }}
            className="text-xs text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
          >
            Bersihkan
          </button>
        </div>

        {/* Message bubble stream */}
        <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {conversation.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : msg.persona === 'gojo'
                    ? 'bg-[#061433]/90 text-slate-200 border border-cyan-500/40 rounded-bl-none shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : msg.persona === 'sasuke'
                    ? 'bg-[#150a29]/90 text-slate-200 border border-purple-500/40 rounded-bl-none shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className={`text-[10px] font-bold ${
                    msg.sender === 'user' ? 'text-white' : msg.persona === 'sasuke' ? 'text-purple-300' : 'text-cyan-300'
                  }`}>
                    {msg.sender === 'user' ? user.name : msg.persona === 'gojo' ? 'Gojo Satoru (Limitless Voice)' : msg.persona === 'sasuke' ? 'Sasuke Uchiha (Rinnegan Voice)' : 'NEXERA AI Core'}
                  </span>
                  <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                {msg.sender === 'ai' && (
                  <button
                    onClick={() => {
                      playClickSound();
                      speakAIResponse(msg.text, msg.persona || persona);
                    }}
                    className={`mt-2 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      msg.persona === 'sasuke' ? 'text-purple-400 hover:text-purple-300' : 'text-cyan-400 hover:text-cyan-300'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" /> 
                    <span>Putar Ulang Suara ({msg.persona === 'sasuke' ? 'Sasuke' : 'Gojo'})</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Text Input Fallback if microphone not working or user wants to type */}
        <form onSubmit={handleManualSubmit} className="pt-2 flex items-center gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={`Ketik pesan untuk didengar dengan suara ${PRESET_DETAILS[persona].character}...`}
            className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="p-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] cursor-pointer transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Technology & Compliance note */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Teknologi Voice Synthesis Anime NEXERA AI:</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          Menggunakan model audio <strong>Gemini 3.8 Flash Lite TTS</strong> dengan <em>speechMetadata styling</em> persona khusus Gojo Satoru (vokal karismatik, santai, dan penuh percaya diri) dan Sasuke Uchiha (vokal rendah, tenang, dingin, dan tajam) berformat studio 24kHz WAV, dengan fallback otomatis ke Web Speech API jika perangkat offline.
        </p>
      </div>
    </div>
  );
};
