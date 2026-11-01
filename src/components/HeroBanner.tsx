import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Zap, Sparkles, Shield, Flame } from 'lucide-react';
import { playGojoSound, playSasukeSound, playClickSound } from '../utils/audio';

export const HeroBanner: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeTechnique, setActiveTechnique] = useState<'none' | 'gojo' | 'sasuke'>('none');
  const [showInfoModal, setShowInfoModal] = useState(false);

  const gojoVideoRef = useRef<HTMLVideoElement>(null);
  const sasukeVideoRef = useRef<HTMLVideoElement>(null);

  // Toggle video play / pause
  const togglePlay = () => {
    playClickSound();
    if (gojoVideoRef.current && sasukeVideoRef.current) {
      if (isPlaying) {
        gojoVideoRef.current.pause();
        sasukeVideoRef.current.pause();
      } else {
        gojoVideoRef.current.play().catch(() => {});
        sasukeVideoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Toggle Audio
  const toggleMute = () => {
    playClickSound();
    setIsMuted(!isMuted);
    if (isMuted) {
      playGojoSound();
    }
  };

  const triggerGojoTechnique = () => {
    playGojoSound();
    setActiveTechnique('gojo');
    setTimeout(() => setActiveTechnique('none'), 3000);
  };

  const triggerSasukeTechnique = () => {
    playSasukeSound();
    setActiveTechnique('sasuke');
    setTimeout(() => setActiveTechnique('none'), 3000);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-[#060b1d] to-[#040714] shadow-[0_0_35px_rgba(6,182,212,0.18)]">
      {/* Top Banner Control Pills (Play/Pause, Sound, Aura Effects) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={toggleMute}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-slate-700/60 text-slate-300 text-xs font-medium backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-md"
          title={isMuted ? 'Nyalakan Efek Suara Aura' : 'Matikan Efek Suara Aura'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />}
          <span className="hidden sm:inline">{isMuted ? 'Aura Muted' : 'Aura Sound'}</span>
        </button>

        <button
          onClick={togglePlay}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-slate-700/60 text-slate-300 text-xs font-medium backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-md"
          title={isPlaying ? 'Jeda Animasi Video' : 'Putar Animasi Video'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          <span className="hidden sm:inline">{isPlaying ? 'Video On' : 'Paused'}</span>
        </button>

        <button
          onClick={() => {
            playClickSound();
            setShowInfoModal(!showInfoModal);
          }}
          className="p-1 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-slate-700/60 text-slate-300 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Info Karakter"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        </button>
      </div>

      {/* Main Dual Character Arena */}
      <div className="relative h-[220px] sm:h-[300px] md:h-[360px] lg:h-[400px] w-full flex items-stretch">
        {/* Left Side: GOJO SATORU Live Moving Video */}
        <div className="relative w-1/2 h-full overflow-hidden group">
          {/* Animated Video Element for Gojo Satoru */}
          <video
            ref={gojoVideoRef}
            src="https://motionbgs.com/media/147/gojo-satoru-six-eyes.960x540.mp4"
            autoPlay
            loop
            muted
            playsInline
            className={`w-full h-full object-cover object-center filter contrast-125 brightness-105 transition-all duration-700 ${
              activeTechnique === 'gojo' ? 'scale-105 brightness-125' : 'group-hover:scale-102'
            }`}
          />

          {/* Blue Cursed Energy Aura Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/60 via-cyan-950/30 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#040714] via-transparent to-[#040714]/40 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-[#040714] pointer-events-none z-10" />

          {/* Gojo Domain Expansion Lighting Flare */}
          {activeTechnique === 'gojo' && (
            <div className="absolute inset-0 bg-cyan-400/25 mix-blend-screen pointer-events-none animate-pulse transition-all" />
          )}

          {/* Gojo Satoru Character Nameplate (matches screenshot style) */}
          <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 z-20 flex flex-col">
            <button
              onClick={triggerGojoTechnique}
              className="text-left group/btn focus:outline-none cursor-pointer"
              title="Klik untuk aktifkan Muryōkūsho (Infinite Void)"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-orbitron font-extrabold text-sm sm:text-xl lg:text-2xl text-cyan-200 tracking-wider drop-shadow-[0_0_12px_rgba(6,182,212,0.9)]">
                  GOJO SATORU
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <span className="font-orbitron text-[9px] sm:text-xs font-semibold text-cyan-400/90 tracking-widest block uppercase mt-0.5">
                JUJUTSU KAISEN
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300/80 bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded-md mt-1 backdrop-blur-sm opacity-90 group-hover/btn:opacity-100 transition-all">
                <Zap className="w-2.5 h-2.5 text-cyan-400" /> Six Eyes & Limitless
              </span>
            </button>
          </div>
        </div>

        {/* Center: Glowing Holographic NEXERA Emblem & Dimensional Rift */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center justify-center">
          {/* Energy Rings */}
          <div className="relative flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36">
            {/* Outer Rotating Pulse Ring */}
            <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-spin [animation-duration:12s] shadow-[0_0_30px_rgba(6,182,212,0.6)]" />
            <div className="absolute -inset-2 rounded-full border border-purple-500/40 animate-spin [animation-duration:18s] [animation-direction:reverse] shadow-[0_0_30px_rgba(168,85,247,0.6)]" />
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-600/20 blur-xl animate-pulse" />

            {/* Glowing Center Core */}
            <div className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#0a1636] to-[#1c0d2e] border-2 border-cyan-300/80 flex items-center justify-center shadow-[0_0_25px_rgba(56,189,248,0.8)]">
              <span className="font-orbitron font-black text-2xl sm:text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-tr from-cyan-300 via-blue-200 to-purple-200 drop-shadow-[0_0_15px_rgba(6,182,212,1)]">
                N
              </span>
            </div>
          </div>

          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-950/70 border border-cyan-500/30 text-[9px] sm:text-[10px] font-orbitron tracking-widest text-cyan-300 uppercase backdrop-blur-md">
            DIMENSIONAL ARENA
          </div>
        </div>

        {/* Right Side: SASUKE UCHIHA Live Moving Video */}
        <div className="relative w-1/2 h-full overflow-hidden group">
          {/* Animated Video Element for Sasuke Uchiha */}
          <video
            ref={sasukeVideoRef}
            src="https://motionbgs.com/media/1987/sasuke-uchiha-and-sharingan-backdrop.960x540.mp4"
            autoPlay
            loop
            muted
            playsInline
            className={`w-full h-full object-cover object-center filter contrast-125 brightness-105 transition-all duration-700 ${
              activeTechnique === 'sasuke' ? 'scale-105 brightness-125' : 'group-hover:scale-102'
            }`}
          />

          {/* Purple Susanoo Flame Overlays */}
          <div className="absolute inset-0 bg-gradient-to-l from-purple-950/60 via-fuchsia-950/30 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#040714] via-transparent to-[#040714]/40 pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-l from-transparent to-[#040714] pointer-events-none z-10" />

          {/* Sasuke Susanoo Flare */}
          {activeTechnique === 'sasuke' && (
            <div className="absolute inset-0 bg-purple-500/25 mix-blend-screen pointer-events-none animate-pulse transition-all" />
          )}

          {/* Sasuke Uchiha Character Nameplate (matches screenshot style) */}
          <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6 z-20 flex flex-col items-end">
            <button
              onClick={triggerSasukeTechnique}
              className="text-right group/btn focus:outline-none cursor-pointer"
              title="Klik untuk aktifkan Chidori & Susanoo"
            >
              <div className="flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span className="font-orbitron font-extrabold text-sm sm:text-xl lg:text-2xl text-purple-200 tracking-wider drop-shadow-[0_0_12px_rgba(168,85,247,0.9)]">
                  SASUKE UCHIHA
                </span>
              </div>
              <span className="font-orbitron text-[9px] sm:text-xs font-semibold text-purple-400/90 tracking-widest block uppercase mt-0.5">
                NARUTO
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-purple-300/80 bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded-md mt-1 backdrop-blur-sm opacity-90 group-hover/btn:opacity-100 transition-all">
                <Flame className="w-2.5 h-2.5 text-purple-400" /> Sharingan & Rinnegan
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Character Info Modal if toggled */}
      {showInfoModal && (
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 backdrop-blur-xl text-xs flex flex-col sm:flex-row gap-4 justify-between items-center animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Gojo Satoru (Limitless)</p>
              <p className="text-slate-400">Teknik tak terbatas memproses jutaan token dalam hitungan milidetik.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Sasuke Uchiha (Rinnegan)</p>
              <p className="text-slate-400">Analisis visual multi-dimensi dan kecerdasan taktis tingkat tinggi.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
