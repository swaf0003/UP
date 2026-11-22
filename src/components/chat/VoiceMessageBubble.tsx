import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSignedStorageUrl } from "@/lib/urlValidation";

interface VoiceMessageBubbleProps {
  voiceUrl: string;
  duration: number;
  isMine: boolean;
}

const VoiceMessageBubble = ({ voiceUrl, duration, isMine }: VoiceMessageBubbleProps) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>();
  const [bars] = useState(() =>
    Array(20).fill(0).map(() => 0.15 + Math.random() * 0.85)
  );

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const lastTickRef = useRef<number>(0);

  const updateProgress = (now: number) => {
    if (audioRef.current) {
      // Throttle React state updates to ~10Hz instead of 60fps
      if (now - lastTickRef.current >= 100) {
        lastTickRef.current = now;
        const p = audioRef.current.currentTime / (audioRef.current.duration || duration || 1);
        setProgress(p);
        setCurrentTime(audioRef.current.currentTime);
      }
      if (!audioRef.current.paused) {
        animRef.current = requestAnimationFrame(updateProgress);
      }
    }
  };

  const toggle = async () => {
    if (!audioRef.current) {
      const signed = await getSignedStorageUrl("voice-messages", voiceUrl);
      if (!signed) return;
      const a = new Audio(signed);
      a.playbackRate = speed;
      a.onended = () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };
      a.onplay = () => {
        animRef.current = requestAnimationFrame(updateProgress);
      };
      audioRef.current = a;
    }
    if (playing) {
      audioRef.current.pause();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    } else {
      audioRef.current.playbackRate = speed;
      await audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const fmtDur = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const displayTime = playing || currentTime > 0 ? fmtDur(currentTime) : fmtDur(duration);

  return (
    <div className="flex items-center gap-2 min-w-[160px] max-w-[240px]">
      <button
        onClick={toggle}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all",
          isMine
            ? "bg-white/20 hover:bg-white/30"
            : "bg-accent hover:bg-accent/80"
        )}
      >
        {playing ? (
          <Pause className={cn("w-4 h-4", isMine ? "text-white" : "text-accent-foreground")} />
        ) : (
          <Play className={cn("w-4 h-4 ml-0.5", isMine ? "text-white" : "text-accent-foreground")} />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform */}
        <div className="flex items-center gap-[2px] h-6">
          {bars.map((h, i) => {
            const barProgress = i / bars.length;
            const isPlayed = barProgress <= progress;
            return (
              <motion.div
                key={i}
                className={cn(
                  "w-[2.5px] rounded-full transition-colors duration-150",
                  isMine
                    ? isPlayed ? "bg-white" : "bg-white/30"
                    : isPlayed ? "bg-accent-foreground" : "bg-accent-foreground/25"
                )}
                style={{ height: `${h * 100}%` }}
                animate={playing && isPlayed ? { scaleY: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.3, repeat: playing ? Infinity : 0 }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <span className={cn(
            "text-[0.6rem] font-mono",
            isMine ? "text-white/60" : "text-muted-foreground"
          )}>
            {displayTime}
          </span>
          <button
            onClick={cycleSpeed}
            className={cn(
              "text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full transition-colors",
              isMine
                ? "bg-white/15 text-white/70 hover:bg-white/25"
                : "bg-accent text-accent-foreground/70 hover:bg-accent/80"
            )}
          >
            ×{speed}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessageBubble;
