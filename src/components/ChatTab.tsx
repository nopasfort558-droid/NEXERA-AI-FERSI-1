import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Trash2, Copy, Check, Volume2, Shield, Zap, Flame, RefreshCw, Square, Plus } from 'lucide-react';
import { ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  playClickSound, 
  playSuccessSound, 
  playGojoSound, 
  playSasukeSound, 
  synthesizeAndPlayVoice, 
  stopCurrentVoiceAudio 
} from '../utils/audio';

export const ChatTab: React.FC = () => {
  const { user, incrementStats } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('nexera_chat_messages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'msg_init',
        role: 'assistant',
        content: `Halo, **${user.name}**! Saya adalah asisten **NEXERA AI** yang ditenagai oleh kombinasi energi tak terbatas *Gojo Satoru* dan kecerdasan analitis *Sasuke Uchiha*.\n\nApa yang bisa saya bantu untukmu hari ini? Kamu juga bisa memilih persona berbicara di atas (NEXERA AI, Gojo Sensei, atau Sasuke Uchiha)!`,
        timestamp: 'Baru saja',
        persona: 'nexera',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState<'nexera' | 'gojo' | 'sasuke'>('nexera');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [speakingState, setSpeakingState] = useState<'idle' | 'generating' | 'speaking' | 'paused'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    try {
      localStorage.setItem('nexera_chat_messages', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    playClickSound();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    playClickSound();

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      // API call to server with signal
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          persona,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let errorDetail = data.error || 'Terjadi gangguan saat memproses jawaban AI.';
        if (response.status === 401 || response.status === 403) {
          errorDetail = 'Akses API Ditolak (401/403). Kredensial atau otorisasi perlu diperiksa.';
        } else if (response.status === 429) {
          errorDetail = 'Batas kuota/rate limit provider sedang penuh (429). Mohon tunggu beberapa saat sebelum mengirim pesan lagi.';
        } else if (response.status >= 500) {
          errorDetail = `Layanan server AI sedang sibuk (${response.status}). Silakan coba sesaat lagi.`;
        }
        throw new Error(errorDetail);
      }

      playSuccessSound();
      incrementStats('chats');

      const botMessage: ChatMessage = {
        id: `msg_${Date.now()}_b`,
        role: 'assistant',
        content: data.reply || data.text || 'Tidak ada balasan dari server AI.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        persona,
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const cancelMessage: ChatMessage = {
          id: `msg_${Date.now()}_cancelled`,
          role: 'assistant',
          content: '⏹️ Pembuatan balasan dihentikan oleh pengguna.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          persona,
        };
        setMessages((prev) => [...prev, cancelMessage]);
        return;
      }

      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `⚠️ ${err.message || 'Maaf, terjadi kendala saat menghubungi server AI. Silakan coba lagi.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        persona,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    playClickSound();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startNewChat = () => {
    playClickSound();
    if (messages.length <= 1 || window.confirm('Mulai obrolan baru? Pesan saat ini akan diarsipkan.')) {
      const resetMsg: ChatMessage = {
        id: `msg_${Date.now()}_new`,
        role: 'assistant',
        content: `Halo kembali, **${user.name}**! Ini sesi obrolan baru dengan **${
          persona === 'gojo' ? 'Gojo Satoru' : persona === 'sasuke' ? 'Sasuke Uchiha' : 'NEXERA AI'
        }**. Apa topik yang ingin kita bahas hari ini?`,
        timestamp: 'Baru saja',
        persona,
      };
      setMessages([resetMsg]);
      localStorage.setItem('nexera_chat_messages', JSON.stringify([resetMsg]));
    }
  };

  const clearChat = () => {
    playClickSound();
    if (window.confirm('Hapus seluruh riwayat obrolan?')) {
      const resetMsg: ChatMessage = {
        id: `msg_${Date.now()}_reset`,
        role: 'assistant',
        content: `Obrolan telah dibersihkan. Halo lagi, **${user.name}**! Ada yang ingin ditanyakan?`,
        timestamp: 'Baru saja',
        persona,
      };
      setMessages([resetMsg]);
      localStorage.removeItem('nexera_chat_messages');
    }
  };

  const speakText = async (text: string, msgPersona?: string, msgId?: string) => {
    const targetPersona: 'nexera' | 'gojo' | 'sasuke' = 
      msgPersona === 'gojo' ? 'gojo' : msgPersona === 'sasuke' ? 'sasuke' : (persona === 'gojo' || persona === 'sasuke' ? persona : 'nexera');

    if (speakingMsgId === msgId) {
      stopCurrentVoiceAudio();
      setSpeakingMsgId(null);
      setSpeakingState('idle');
      return;
    }

    if (targetPersona === 'gojo') playGojoSound();
    else if (targetPersona === 'sasuke') playSasukeSound();
    else playClickSound();

    setSpeakingMsgId(msgId || 'active');
    setSpeakingState('generating');

    await synthesizeAndPlayVoice(text, targetPersona, {
      onStart: () => {
        setSpeakingMsgId(msgId || 'active');
        setSpeakingState('speaking');
      },
      onStateChange: (st) => {
        if (st === 'speaking') setSpeakingState('speaking');
        else if (st === 'generating') setSpeakingState('generating');
        else if (st === 'paused') setSpeakingState('paused');
        else if (st === 'completed' || st === 'idle') {
          setSpeakingMsgId(null);
          setSpeakingState('idle');
        }
      },
      onEnd: () => {
        setSpeakingMsgId(null);
        setSpeakingState('idle');
      },
      onError: () => {
        setSpeakingMsgId(null);
        setSpeakingState('idle');
      }
    });
  };

  const suggestedPrompts = [
    { label: 'Jelaskan Domain Expansion Gojo', icon: Zap },
    { label: 'Bagaimana Sasuke membangkitkan Rinnegan?', icon: Flame },
    { label: 'Buatkan tips belajar coding yang efektif', icon: Sparkles },
    { label: 'Buat puisi futuristik tentang AI & Ninja', icon: Bot },
  ];

  return (
    <div className="w-full flex flex-col h-[calc(100vh-140px)] min-h-[500px] max-w-5xl mx-auto rounded-3xl bg-[#050b1f]/90 border border-cyan-500/30 overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-xl">
      {/* Chat Top Header & Persona Selector */}
      <div className="p-3.5 sm:p-4 bg-slate-950/70 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
        {/* Active Persona Chips */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Persona:</span>
          
          <button
            onClick={() => {
              playClickSound();
              setPersona('nexera');
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              persona === 'nexera'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)] border border-cyan-300'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>NEXERA AI</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setPersona('gojo');
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              persona === 'gojo'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] border border-blue-300'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-300" />
            <span>Gojo Satoru</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setPersona('sasuke');
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              persona === 'sasuke'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] border border-purple-300'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-purple-300" />
            <span>Sasuke Uchiha</span>
          </button>
        </div>

        {/* Header Actions: New Chat & Clear Chat */}
        <div className="flex items-center gap-2">
          <button
            onClick={startNewChat}
            className="p-1.5 px-2.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 transition-all text-xs flex items-center gap-1.5 cursor-pointer font-semibold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            title="Mulai Sesi Obrolan Baru"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Obrolan Baru</span>
          </button>

          <button
            onClick={clearChat}
            className="p-1.5 px-2 rounded-lg bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-300 transition-all text-xs flex items-center gap-1 cursor-pointer"
            title="Bersihkan Percakapan"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 flex items-center justify-center p-0.5 border shadow-md ${
                  isUser
                    ? 'border-cyan-400 bg-cyan-950 text-cyan-200'
                    : msg.persona === 'gojo'
                    ? 'border-blue-400 bg-blue-950 text-blue-200'
                    : msg.persona === 'sasuke'
                    ? 'border-purple-400 bg-purple-950 text-purple-200'
                    : 'border-cyan-500 bg-cyan-950 text-cyan-200'
                }`}
              >
                {isUser ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : msg.persona === 'gojo' ? (
                  <Zap className="w-4 h-4 text-cyan-300" />
                ) : msg.persona === 'sasuke' ? (
                  <Flame className="w-4 h-4 text-purple-300" />
                ) : (
                  <Bot className="w-4 h-4 text-cyan-300" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm leading-relaxed shadow-lg ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                }`}
              >
                {/* Persona label if assistant */}
                {!isUser && (
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800/80">
                    <span className="font-orbitron text-[10px] font-bold text-cyan-400 tracking-wider uppercase">
                      {msg.persona === 'gojo'
                        ? 'Gojo Satoru (Limitless)'
                        : msg.persona === 'sasuke'
                        ? 'Sasuke Uchiha (Rinnegan)'
                        : 'NEXERA AI'}
                    </span>
                    {msg.modelUsed && (
                      <span className="text-[9px] font-mono text-slate-500">
                        {msg.modelUsed}
                      </span>
                    )}
                  </div>
                )}

                {/* Formatted Message text */}
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                {/* Footer action buttons for AI responses */}
                {!isUser && (
                  <div className="mt-2.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => speakText(msg.content, msg.persona, msg.id)}
                        className={`transition-all p-1 flex items-center gap-1 cursor-pointer rounded-md ${
                          speakingMsgId === msg.id
                            ? 'text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-500/40 animate-pulse'
                            : 'hover:text-cyan-300 text-slate-400'
                        }`}
                        title={`Dengarkan Suara ${msg.persona === 'gojo' ? 'Gojo Satoru' : msg.persona === 'sasuke' ? 'Sasuke Uchiha' : 'AI'}`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden xs:inline">
                          {speakingMsgId === msg.id 
                            ? 'Berbicara...' 
                            : msg.persona === 'gojo' 
                            ? 'Suara Gojo' 
                            : msg.persona === 'sasuke' 
                            ? 'Suara Sasuke' 
                            : 'Dengarkan'}
                        </span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="hover:text-cyan-300 transition-colors p-1"
                        title="Salin Teks"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Spinner Indicator */}
        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-cyan-500/40 flex items-center justify-center text-cyan-400 animate-spin">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>
                {persona === 'gojo'
                  ? 'Gojo Satoru sedang memproses dengan Six Eyes...'
                  : persona === 'sasuke'
                  ? 'Sasuke Uchiha sedang menganalisis dengan Sharingan...'
                  : 'NEXERA AI sedang berpikir...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts if few messages */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 flex flex-wrap gap-2 bg-slate-950/40 border-t border-slate-800/60">
          {suggestedPrompts.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-cyan-950/50 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 text-xs transition-all active:scale-95 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Message Input Box */}
      <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-cyan-500/30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ketik pesan untuk ${
              persona === 'gojo' ? 'Gojo Satoru' : persona === 'sasuke' ? 'Sasuke Uchiha' : 'NEXERA AI'
            }...`}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-xs sm:text-sm transition-all"
          />

          {loading ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              className="p-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] active:scale-95 transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 font-bold text-xs"
              title="Hentikan Pembuatan Balasan AI"
            >
              <Square className="w-4 h-4 fill-white" />
              <span className="hidden sm:inline">Berhenti</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer flex-shrink-0"
              aria-label="Kirim Pesan"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
