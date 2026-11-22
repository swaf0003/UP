import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Play, Pause, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onSend?: (blob: Blob, duration: number) => void;
  compact?: boolean;
}

const VoiceRecorder = ({ onSend, compact = false }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(24).fill(0.1));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>();
  const recordedUrlRef = useRef<string | null>(null);

  const MAX_RECORDING_SECONDS = 120;

  useEffect(() => {
    recordedUrlRef.current = recordedUrl;
  }, [recordedUrl]);

  // Clean up AudioContext, MediaStream, MediaRecorder, and Object URLs on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
    };
  }, []);

  // Waveform animation during recording (throttled & auto-stopped at 120s)
  useEffect(() => {
    if (isRecording) {
      const iv = setInterval(() => {
        setDuration((d) => {
          const next = d + 0.1;
          if (next >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return next;
        });
      }, 100);
      intervalRef.current = iv;

      let lastFrame = 0;
      const updateWaveform = (now: number) => {
        if (now - lastFrame >= 80 && analyserRef.current) {
          lastFrame = now;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const bars = Array(24).fill(0).map((_, i) => {
            const idx = Math.floor((i / 24) * data.length);
            return Math.max(0.1, data[idx] / 255);
          });
          setWaveformBars(bars);
        }
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      animFrameRef.current = requestAnimationFrame(updateWaveform);

      return () => {
        clearInterval(iv);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for waveform & track AudioContext for cleanup
      audioCtxRef.current?.close().catch(() => {});
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setRecordedUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setWaveformBars(Array(24).fill(0).map(() => 0.15 + Math.random() * 0.7));
        stream.getTracks().forEach((t) => t.stop());
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordedBlob(null);
      setRecordedUrl(null);
      setDuration(0);
    } catch {
      // Microphone permission denied
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    mediaRecorderRef.current?.stop();
  };

  const cancel = () => {
    setIsRecording(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    setWaveformBars(Array(24).fill(0.1));
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const togglePlayback = () => {
    if (!audioRef.current && recordedUrl) {
      const audio = new Audio(recordedUrl);
      audio.playbackRate = playbackSpeed;
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const cycleSpeed = () => {
    const next = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const handleSend = () => {
    if (recordedBlob && onSend) {
      onSend(recordedBlob, duration);
    }
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    audioRef.current = null;
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    setIsPlaying(false);
    setWaveformBars(Array(24).fill(0.1));
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Idle: just mic button
  if (!isRecording && !recordedBlob) {
    return (
      <Button
        size="icon"
        variant="ghost"
        onClick={startRecording}
        className={cn("rounded-xl text-muted-foreground hover:text-foreground shrink-0", compact && "w-9 h-9")}
        title="Enregistrer un message vocal"
      >
        <Mic className={cn("text-muted-foreground", compact ? "w-4 h-4" : "w-5 h-5")} />
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl",
          isRecording ? "glass border-destructive/30" : "glass"
        )}
      >
        <button onClick={cancel} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-[2px] h-8 flex-1 min-w-0">
          {waveformBars.map((h, i) => (
            <motion.div
              key={i}
              animate={{ scaleY: h }}
              transition={{ duration: isRecording ? 0.1 : 0.3, ease: "easeOut" }}
              className={cn(
                "w-[3px] rounded-full origin-center",
                isRecording ? "bg-destructive" : "bg-accent-foreground/50"
              )}
              style={{ height: "100%" }}
            />
          ))}
        </div>

        <span className={cn("text-xs font-mono shrink-0", isRecording ? "text-destructive" : "text-muted-foreground")}>
          {formatTime(duration)}
        </span>

        {isRecording ? (
          <Button size="icon" variant="ghost" onClick={stopRecording} className="w-8 h-8 rounded-full bg-destructive/10 shrink-0">
            <Square className="w-3.5 h-3.5 text-destructive" />
          </Button>
        ) : (
          <>
            <button onClick={togglePlayback} className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center shrink-0">
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-accent-foreground" /> : <Play className="w-3.5 h-3.5 text-accent-foreground ml-0.5" />}
            </button>
            <button onClick={cycleSpeed} className="text-[0.6rem] font-bold text-muted-foreground hover:text-foreground shrink-0 w-6">
              x{playbackSpeed}
            </button>
            <Button size="icon" onClick={handleSend} className="w-8 h-8 rounded-full gradient-primary shrink-0">
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </Button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceRecorder;
