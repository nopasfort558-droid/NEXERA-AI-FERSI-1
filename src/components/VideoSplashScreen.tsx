import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronRight, AlertCircle, Play } from 'lucide-react';

interface VideoSplashScreenProps {
  onComplete: () => void;
  isLoggedIn: boolean;
  onOpenLogin: () => void;
}

export const VideoSplashScreen: React.FC<VideoSplashScreenProps> = ({
  onComplete,
  isLoggedIn,
  onOpenLogin,
}) => {
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoSrc = '/assets/aistudio/0917b122ec9550c5f8cc7af05654b859_980c61fe.mp4';

  const finishIntro = () => {
    try {
      sessionStorage.setItem('nexera_intro_played', 'true');
    } catch {
      // ignore
    }
    onComplete();
    if (!isLoggedIn) {
      // Prompt user with login if not logged in
      setTimeout(() => {
        onOpenLogin();
      }, 350);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    const handleEnded = () => {
      finishIntro();
    };
    const handleError = () => {
      console.warn('Video failed to play or format issue. Activating fallback.');
      setVideoError(true);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Attempt autoplay muted
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay prevented by browser policy:', err);
        // User interaction might be required if browser strictly blocks autoplay
      });
    }

    // Safety timeout: if video doesn't end or hangs after 15 seconds, proceed
    const safetyTimeout = setTimeout(() => {
      finishIntro();
    }, 14000);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      clearTimeout(safetyTimeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[140px]" />
      </div>

      {/* Top Branding Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-20 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center font-orbitron font-black text-white text-sm shadow-[0_0_15px_rgba(6,182,212,0.6)]">
            N
          </div>
          <span className="font-orbitron font-extrabold text-white text-sm sm:text-base tracking-widest">
            NEXERA AI
          </span>
        </div>

        {/* Skip Button */}
        <button
          onClick={finishIntro}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-400/50 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
        >
          <span>Lewati</span>
          <ChevronRight className="w-4 h-4 text-cyan-400" />
        </button>
      </div>

      {/* Main Video Frame */}
      <div className="relative w-full max-w-sm sm:max-w-md h-[78vh] sm:h-[82vh] max-h-[820px] flex items-center justify-center px-4 z-10">
        {!videoError ? (
          <div className="relative w-full h-full rounded-3xl overflow-hidden border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.3)] bg-black/60 flex items-center justify-center">
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              muted
              playsInline
              controls={false}
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Click to play if browser blocked autoplay */}
            {!isPlaying && (
              <button
                onClick={() => videoRef.current?.play()}
                className="absolute z-20 p-4 rounded-full bg-cyan-500/80 text-white shadow-[0_0_25px_rgba(6,182,212,0.7)] animate-bounce cursor-pointer flex items-center gap-2 text-xs font-bold"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Mulai Video</span>
              </button>
            )}
          </div>
        ) : (
          /* Fallback view if video format or browser codec fails */
          <div className="p-8 rounded-3xl bg-[#091024] border border-cyan-500/40 text-center space-y-4 max-w-xs shadow-[0_0_40px_rgba(6,182,212,0.2)]">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mx-auto text-cyan-400">
              <Sparkles className="w-8 h-8 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-orbitron">
                NEXERA AI
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Limitless Intelligence Core Initialized.
              </p>
            </div>
            <button
              onClick={finishIntro}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs font-bold hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
            >
              Masuk ke Aplikasi
            </button>
          </div>
        )}
      </div>

      {/* Bottom Progress Bar */}
      <div className="absolute bottom-6 left-0 right-0 max-w-xs sm:max-w-md mx-auto px-6 z-20 space-y-2">
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-150 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-[10px] tracking-wider text-slate-400 font-mono">
          NEXERA AI • OFFICIAL OPENING ANIMATION
        </p>
      </div>
    </div>
  );
};
