// Synthetic audio generator using Web Audio API for reliable SFX
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // ignore
  }
}

export function playGojoSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Cursed energy shimmer
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {
    // ignore
  }
}

export function playSasukeSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Chidori lightning crackle
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600 + Math.random() * 800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150 + Math.random() * 200, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      }, i * 60);
    }
  } catch (e) {
    // ignore
  }
}

export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }, idx * 70);
    });
  } catch (e) {
    // ignore
  }
}

export function playErrorSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // ignore
  }
}

// Voice playback state management and multi-chunk queue player
export type VoicePlaybackState = 'idle' | 'generating' | 'speaking' | 'paused' | 'completed' | 'error';

export interface VoicePlayerStatus {
  state: VoicePlaybackState;
  persona: 'gojo' | 'sasuke' | 'nexera';
  currentChunkIndex: number;
  totalChunks: number;
  currentText: string;
}

interface AudioChunkItem {
  text: string;
  audioBase64: string;
}

class VoiceAudioQueueManager {
  private currentAudio: HTMLAudioElement | null = null;
  private queue: AudioChunkItem[] = [];
  private currentIdx = 0;
  private persona: 'gojo' | 'sasuke' | 'nexera' = 'nexera';
  private state: VoicePlaybackState = 'idle';
  private originalText = '';
  private abortController: AbortController | null = null;

  private onStateChangeCb?: (state: VoicePlaybackState) => void;
  private onProgressCb?: (current: number, total: number, text: string) => void;
  private onEndCb?: () => void;
  private onErrorCb?: (error: string) => void;

  public getStatus(): VoicePlayerStatus {
    return {
      state: this.state,
      persona: this.persona,
      currentChunkIndex: this.currentIdx + 1,
      totalChunks: Math.max(this.queue.length, 1),
      currentText: this.queue[this.currentIdx]?.text || this.originalText,
    };
  }

  public registerCallbacks(cbs: {
    onStateChange?: (state: VoicePlaybackState) => void;
    onProgress?: (current: number, total: number, text: string) => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
  }) {
    this.onStateChangeCb = cbs.onStateChange;
    this.onProgressCb = cbs.onProgress;
    this.onEndCb = cbs.onEnd;
    this.onErrorCb = cbs.onError;
  }

  private setState(newState: VoicePlaybackState) {
    this.state = newState;
    if (this.onStateChangeCb) {
      this.onStateChangeCb(newState);
    }
  }

  public stop() {
    if (this.abortController) {
      try { this.abortController.abort(); } catch {}
      this.abortController = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.queue = [];
    this.currentIdx = 0;
    this.setState('idle');
  }

  public pause() {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.setState('paused');
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      this.setState('paused');
    }
  }

  public resume() {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().then(() => {
        this.setState('speaking');
      }).catch(() => {
        this.setState('error');
      });
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.setState('speaking');
    }
  }

  public replay() {
    if (this.queue.length > 0) {
      this.currentIdx = 0;
      this.playChunkAt(0);
    } else if (this.originalText) {
      this.synthesizeAndPlay(this.originalText, this.persona);
    }
  }

  private playChunkAt(index: number) {
    if (index >= this.queue.length) {
      this.setState('completed');
      if (this.onEndCb) this.onEndCb();
      return;
    }

    this.currentIdx = index;
    const chunk = this.queue[index];

    if (this.onProgressCb) {
      this.onProgressCb(index + 1, this.queue.length, chunk.text);
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }

    const audio = new Audio(`data:audio/wav;base64,${chunk.audioBase64}`);
    this.currentAudio = audio;
    this.setState('speaking');

    audio.onended = () => {
      this.playChunkAt(index + 1);
    };

    audio.onerror = (e) => {
      console.warn(`Error playing chunk ${index + 1}, moving to next:`, e);
      // Try next chunk or finish
      if (index + 1 < this.queue.length) {
        this.playChunkAt(index + 1);
      } else {
        this.setState('error');
        if (this.onErrorCb) this.onErrorCb('Terjadi kesalahan pemutaran audio.');
      }
    };

    audio.play().catch((err) => {
      console.warn('Autoplay blocked or playback error:', err);
      this.setState('paused');
    });
  }

  public async synthesizeAndPlay(
    text: string,
    persona: 'gojo' | 'sasuke' | 'nexera',
    callbacks?: {
      onStateChange?: (state: VoicePlaybackState) => void;
      onProgress?: (current: number, total: number, text: string) => void;
      onEnd?: () => void;
      onError?: (error: string) => void;
    }
  ): Promise<void> {
    this.stop();
    this.persona = persona;
    this.originalText = text;
    if (callbacks) this.registerCallbacks(callbacks);

    this.setState('generating');

    this.abortController = new AbortController();

    try {
      const res = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona }),
        signal: this.abortController.signal,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.useClientFallback) {
          this.fallbackWebSpeechQueue(text, persona);
          return;
        }

        if (Array.isArray(data.chunks) && data.chunks.length > 0 && data.chunks[0]?.audioBase64) {
          this.queue = data.chunks;
          this.playChunkAt(0);
          return;
        } else if (data.audioBase64) {
          this.queue = [{ text, audioBase64: data.audioBase64 }];
          this.playChunkAt(0);
          return;
        }
      }

      this.fallbackWebSpeechQueue(text, persona);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.setState('idle');
        return;
      }
      this.fallbackWebSpeechQueue(text, persona);
    }
  }

  private fallbackWebSpeechQueue(text: string, persona: 'gojo' | 'sasuke' | 'nexera') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.setState('error');
      if (this.onErrorCb) this.onErrorCb('Browser tidak mendukung sintesis suara.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const cleanText = text
        .replace(/[*_#`~[\]]/g, '')
        .replace(/https?:\/\/\S+/g, 'tautan')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .trim();

      // Chunk long text into natural phrases for browser speech
      const sentences = cleanText.match(/[^.!?\n]+[.!?\n]*/g) || [cleanText];
      this.queue = sentences.map((s) => ({ text: s.trim(), audioBase64: '' })).filter((s) => s.text);
      if (this.queue.length === 0) {
        this.setState('idle');
        return;
      }

      const getBestVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        // Priority 1: Indonesian voice (id-ID)
        let matched = voices.find((v) => v.lang.startsWith('id') || v.lang.toLowerCase().includes('id'));
        if (matched) return matched;
        // Priority 2: Japanese voice for anime vibe
        matched = voices.find((v) => v.lang.startsWith('ja') || v.lang.toLowerCase().includes('ja'));
        if (matched) return matched;
        // Priority 3: Default voice
        return voices.find((v) => v.default) || voices[0] || null;
      };

      let currentSentenceIdx = 0;
      this.setState('speaking');

      const speakNext = () => {
        if (currentSentenceIdx >= this.queue.length) {
          this.setState('completed');
          if (this.onEndCb) this.onEndCb();
          return;
        }

        const chunk = this.queue[currentSentenceIdx];
        if (this.onProgressCb) {
          this.onProgressCb(currentSentenceIdx + 1, this.queue.length, chunk.text);
        }

        const utterance = new SpeechSynthesisUtterance(chunk.text);
        utterance.lang = 'id-ID';

        const voice = getBestVoice();
        if (voice) utterance.voice = voice;

        // Custom pitch & rate calibrated for characters
        if (persona === 'gojo') {
          utterance.pitch = 1.15; // Playful, confident mid-tenor
          utterance.rate = 1.05;
        } else if (persona === 'sasuke') {
          utterance.pitch = 0.82; // Deep, calm baritone
          utterance.rate = 0.92;
        } else {
          utterance.pitch = 1.0;
          utterance.rate = 1.0;
        }

        utterance.onend = () => {
          currentSentenceIdx++;
          speakNext();
        };

        utterance.onerror = () => {
          currentSentenceIdx++;
          speakNext();
        };

        // Resume if suspended before speaking
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      };

      // If voices are not yet loaded, wait for voiceschanged
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          speakNext();
        };
      } else {
        speakNext();
      }
    } catch {
      this.setState('error');
      if (this.onErrorCb) this.onErrorCb('Gagal mengaktifkan Web Speech.');
    }
  }
}

// Global singleton instance
export const voicePlayer = new VoiceAudioQueueManager();

export function stopCurrentVoiceAudio() {
  voicePlayer.stop();
}

export function pauseCurrentVoiceAudio() {
  voicePlayer.pause();
}

export function resumeCurrentVoiceAudio() {
  voicePlayer.resume();
}

export function replayCurrentVoiceAudio() {
  voicePlayer.replay();
}

export function getVoicePlayerState(): VoicePlayerStatus {
  return voicePlayer.getStatus();
}

export async function synthesizeAndPlayVoice(
  text: string,
  persona: 'gojo' | 'sasuke' | 'nexera',
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: string) => void;
    onStateChange?: (state: VoicePlaybackState) => void;
    onProgress?: (current: number, total: number, text: string) => void;
  }
): Promise<void> {
  const { onStart, onEnd, onError, onStateChange, onProgress } = callbacks || {};
  if (onStart) onStart();

  return voicePlayer.synthesizeAndPlay(text, persona, {
    onStateChange: (st) => {
      if (onStateChange) onStateChange(st);
      if (st === 'completed' && onEnd) onEnd();
      if (st === 'error' && onError) onError('Gagal memutar audio.');
    },
    onProgress,
    onEnd,
    onError,
  });
}



