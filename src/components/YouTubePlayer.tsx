import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeExternalUrl } from "@/lib/urlValidation";

interface YouTubePlayerProps {
  url: string;
  title: string;
}

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const YouTubePlayer = ({ url, title }: YouTubePlayerProps) => {
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    const safeUrl = sanitizeExternalUrl(url);
    return (
      <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
        Ouvrir la vidéo ↗
      </a>
    );
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  return (
    <AnimatePresence mode="wait">
      {!playing ? (
        <motion.button
          key="thumbnail"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setPlaying(true)}
          className="relative w-full aspect-video rounded-xl overflow-hidden group cursor-pointer mt-2 touch-manipulation"
        >
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 active:bg-black/10 transition-colors flex items-center justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-destructive/90 flex items-center justify-center group-hover:scale-110 group-active:scale-105 transition-transform shadow-lg">
              <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-[0.65rem] sm:text-xs text-white/80 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 truncate">
              {title}
            </p>
          </div>
        </motion.button>
      ) : (
        <motion.div
          key="player"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn(
            "relative mt-2 rounded-xl overflow-hidden bg-black",
            expanded 
              ? "fixed inset-2 sm:inset-4 z-50" 
              : "w-full aspect-video"
          )}
        >
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full absolute inset-0"
          />
          <div className="absolute top-2 right-2 flex gap-1.5 z-10">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 active:bg-black/90 transition-colors touch-manipulation"
            >
              {expanded ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
            </button>
            <button
              onClick={() => { setPlaying(false); setExpanded(false); }}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 active:bg-black/90 transition-colors touch-manipulation"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          {expanded && (
            <div className="fixed inset-0 bg-black/70 -z-10" onClick={() => setExpanded(false)} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default YouTubePlayer;
