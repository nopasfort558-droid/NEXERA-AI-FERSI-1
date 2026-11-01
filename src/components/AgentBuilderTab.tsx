import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Plus, 
  Edit3, 
  Trash2, 
  MessageSquare, 
  Sparkles, 
  Check, 
  X, 
  Send, 
  Volume2, 
  RotateCcw,
  UserCheck,
  Shield,
  Zap,
  Flame,
  Code2,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { AIAgent, ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const AgentBuilderTab: React.FC = () => {
  const { user, incrementStats } = useAuth();
  const storageKey = `nexera_agents_${user.id}`;

  const defaultAgents: AIAgent[] = [
    {
      id: 'agent_nanami',
      userId: user.id,
      name: 'Kento Nanami (Analyst)',
      role: 'Konsultan Rasional & Manajemen Waktu',
      personality: 'Realistis, efisien, profesional, mengutamakan work-life balance dan ketepatan data',
      speakingStyle: 'Bahasa Indonesia tenang, logis, tanpa basa-basi berlebihan',
      instructions: 'Kamu adalah Kento Nanami, penyihir jujutsu tingkat 1 yang kini bertindak sebagai asisten analitis di NEXERA AI. Berikan solusi praktis, efisien, dan rasional untuk produktivitas pengguna.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      category: 'business',
      createdAt: 'Bawaan Sistem',
    },
    {
      id: 'agent_code_master',
      userId: user.id,
      name: 'Cyber Architect (Dev)',
      role: 'Senior Fullstack Engineer & Code Reviewer',
      personality: 'Ahli arsitektur software, clean code, performa tinggi, dan debugging cepat',
      speakingStyle: 'Bahasa Indonesia teknis terstruktur dengan blok kode bersih dan penjelasan arsitektur',
      instructions: 'Kamu adalah Cyber Architect, Principal Engineer di NEXERA AI. Bantu pengguna menulis kode React, Node.js, TypeScript, Python, dan arsitektur sistem tingkat lanjut tanpa bug.',
      avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80',
      category: 'coding',
      createdAt: 'Bawaan Sistem',
    },
  ];

  const [agents, setAgents] = useState<AIAgent[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultAgents;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(agents));
    } catch (e) {}
  }, [agents, storageKey]);

  // Modal create/edit state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [personality, setPersonality] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [category, setCategory] = useState<AIAgent['category']>('creative');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80');

  // Active chat with specific agent
  const [activeChatAgent, setActiveChatAgent] = useState<AIAgent | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const avatarOptions = [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  ];

  const openCreateModal = () => {
    playClickSound();
    setEditingAgent(null);
    setName('');
    setRole('');
    setPersonality('Cerdas, ramah, dan solutif');
    setSpeakingStyle('Bahasa Indonesia santai dan terstruktur rapi');
    setInstructions('Kamu adalah AI Agent kustom yang setia membantu pengguna dalam menyelesaikan setiap tugasnya.');
    setCategory('creative');
    setAvatar(avatarOptions[0]);
    setModalOpen(true);
  };

  const openEditModal = (agent: AIAgent) => {
    playClickSound();
    setEditingAgent(agent);
    setName(agent.name);
    setRole(agent.role);
    setPersonality(agent.personality);
    setSpeakingStyle(agent.speakingStyle);
    setInstructions(agent.instructions);
    setCategory(agent.category);
    setAvatar(agent.avatar);
    setModalOpen(true);
  };

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !instructions.trim()) return;

    playSuccessSound();

    if (editingAgent) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === editingAgent.id
            ? {
                ...a,
                name: name.trim(),
                role: role.trim() || 'AI Specialist',
                personality: personality.trim(),
                speakingStyle: speakingStyle.trim(),
                instructions: instructions.trim(),
                category,
                avatar,
              }
            : a
        )
      );
    } else {
      const newAgent: AIAgent = {
        id: `agent_${Date.now()}`,
        userId: user.id,
        name: name.trim(),
        role: role.trim() || 'AI Specialist',
        personality: personality.trim(),
        speakingStyle: speakingStyle.trim(),
        instructions: instructions.trim(),
        category,
        avatar,
        createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
      setAgents((prev) => [newAgent, ...prev]);
    }

    setModalOpen(false);
  };

  const handleDeleteAgent = (agentId: string) => {
    playClickSound();
    if (window.confirm('Hapus Agent AI ini secara permanen?')) {
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      if (activeChatAgent?.id === agentId) {
        setActiveChatAgent(null);
      }
    }
  };

  const startChatWithAgent = (agent: AIAgent) => {
    playClickSound();
    setActiveChatAgent(agent);
    setChatMessages([
      {
        id: `msg_agent_init_${Date.now()}`,
        role: 'assistant',
        content: `Halo, **${user.name}**! Saya adalah **${agent.name}** (${agent.role}).\n\nKepribadian saya: *${agent.personality}*.\nApa yang bisa saya bantu atau diskusikan bersamamu sekarang?`,
        timestamp: 'Baru saja',
        agentName: agent.name,
        agentAvatar: agent.avatar,
      },
    ]);
  };

  const handleSendAgentMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || !activeChatAgent || chatLoading) return;

    playClickSound();
    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setChatInput('');
    setChatLoading(true);

    try {
      // Fetch active memories from localStorage
      let activeMemories: string[] = [];
      try {
        const memData = localStorage.getItem(`nexera_memory_${user.id}`);
        if (memData) {
          const parsed = JSON.parse(memData);
          if (parsed.enabled) {
            activeMemories = (parsed.items || []).filter((i: any) => i.enabled).map((i: any) => i.fact);
          }
        }
      } catch (e) {}

      const customSystemInstruction = 
        `Kamu adalah "${activeChatAgent.name}", dengan peran: "${activeChatAgent.role}".\n` +
        `Kepribadian: "${activeChatAgent.personality}".\n` +
        `Gaya Bicara: "${activeChatAgent.speakingStyle}".\n` +
        `Instruksi Khusus Inti:\n${activeChatAgent.instructions}\n\n` +
        `Pengguna yang berbicara denganmu bernama "${user.name}". Jawablah selalu dengan persona ini secara konsisten dalam Bahasa Indonesia.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
          customSystemInstruction,
          memories: activeMemories,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memproses jawaban agent.');

      playSuccessSound();
      incrementStats('chats');

      const botMsg: ChatMessage = {
        id: `msg_b_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentName: activeChatAgent.name,
        agentAvatar: activeChatAgent.avatar,
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Maaf, terjadi gangguan pada koneksi AI: ${err.message}`,
          timestamp: 'Baru saja',
          agentName: activeChatAgent.name,
        },
      ]);
    } finally {
      setChatLoading(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-[#0d1636] via-[#150a30] to-[#06182e] border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.18)] backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  AI Agent Builder
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                  Kustom Multi-Persona
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Bangun asisten AI pribadi Anda sendiri dengan identitas, gaya bicara, dan kepribadian yang unik untuk kebutuhan spesifik.
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Agent Baru</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Agent Cards or Active Chat */}
      {activeChatAgent ? (
        /* Dedicated Chat Room with Active Custom Agent */
        <div className="rounded-3xl bg-[#050b1f]/90 border border-cyan-500/30 overflow-hidden shadow-2xl flex flex-col h-[600px]">
          {/* Header */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={activeChatAgent.avatar}
                alt={activeChatAgent.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm">{activeChatAgent.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold">
                    {activeChatAgent.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{activeChatAgent.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startChatWithAgent(activeChatAgent)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
                title="Reset Sesi Chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveChatAgent(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Kembali ke Daftar Agent
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <img
                  src={msg.role === 'user' ? user.avatar : activeChatAgent.avatar}
                  alt={msg.role}
                  className="w-8 h-8 rounded-full object-cover border border-cyan-500/40"
                />
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>{activeChatAgent.name} sedang merespon...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendAgentMessage} className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Bicara dengan ${activeChatAgent.name}...`}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="p-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* Agent List Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-3xl p-5 bg-gradient-to-b from-slate-900/90 to-[#060c22] border border-slate-800 hover:border-cyan-500/50 shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight group-hover:text-cyan-300 transition-colors">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-cyan-400 font-medium mt-0.5">{agent.role}</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold uppercase">
                    {agent.category}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300 py-2 border-t border-slate-800/80">
                  <p className="line-clamp-2 text-slate-400">
                    <strong className="text-slate-200">Gaya:</strong> {agent.speakingStyle}
                  </p>
                  <p className="line-clamp-2 text-slate-400">
                    <strong className="text-slate-200">Instruksi:</strong> {agent.instructions}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => startChatWithAgent(agent)}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat dengan Agent</span>
                </button>

                <button
                  onClick={() => openEditModal(agent)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all"
                  title="Edit Agent"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/80 text-slate-400 hover:text-red-400 cursor-pointer transition-all"
                  title="Hapus Agent"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#070e24] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <span>{editingAgent ? 'Edit AI Agent' : 'Buat AI Agent Baru'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Agent:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Sensei Nanami / Dr. Cyber / Marketing Pro"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Peran / Profesi Agent:</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Contoh: Konsultan Bisnis & Manajemen Waktu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kategori:</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="coding">Coding & IT</option>
                    <option value="anime">Anime & Manga</option>
                    <option value="business">Bisnis & Finansial</option>
                    <option value="creative">Kreatif & Penulisan</option>
                    <option value="tutor">Edukasi & Tutor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Pilih Avatar:</label>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {avatarOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAvatar(opt)}
                        className={`w-8 h-8 rounded-full border-2 overflow-hidden flex-shrink-0 cursor-pointer ${
                          avatar === opt ? 'border-cyan-400 scale-110 shadow-sm' : 'border-transparent opacity-60'
                        }`}
                      >
                        <img src={opt} alt="Avatar" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Kepribadian (Personality):</label>
                <input
                  type="text"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Contoh: Karismatik, tenang, sedikit humoris, sangat solutif"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Gaya Bicara:</label>
                <input
                  type="text"
                  value={speakingStyle}
                  onChange={(e) => setSpeakingStyle(e.target.value)}
                  placeholder="Contoh: Bahasa Indonesia santai, panggil pengguna dengan 'Kawan'"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Instruksi Khusus (System Prompt):
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  placeholder="Berikan pedoman detail tentang apa yang boleh dan tidak boleh dilakukan oleh Agent ini..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-bold cursor-pointer shadow-md"
                >
                  {editingAgent ? 'Simpan Perubahan' : 'Buat Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
