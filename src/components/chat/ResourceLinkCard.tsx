import { motion } from "framer-motion";
import { FileText, Video, ClipboardList, ExternalLink, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ResourceLinkCardProps {
  resourceId: string;
  title: string;
  type: string;
  courseName: string;
  isMine: boolean;
}

const typeIcons: Record<string, any> = {
  pdf: FileText,
  video: Video,
  exam: ClipboardList,
  summary: BookOpen,
};

const typeLabels: Record<string, string> = {
  pdf: "PDF",
  video: "Vidéo",
  exam: "Examen",
  summary: "Résumé",
};

const ResourceLinkCard = ({ resourceId, title, type, courseName, isMine }: ResourceLinkCardProps) => {
  const navigate = useNavigate();
  const Icon = typeIcons[type] || FileText;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/resources?highlight=${resourceId}`)}
      className={cn(
        "w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-colors mt-1",
        isMine
          ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15"
          : "border-border bg-accent/30 hover:bg-accent/50"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        isMine ? "bg-primary-foreground/20" : "bg-primary/10"
      )}>
        <Icon className={cn("w-4 h-4", isMine ? "text-primary-foreground" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-medium truncate", isMine ? "text-primary-foreground" : "text-foreground")}>{title}</p>
        <p className={cn("text-[0.6rem]", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {typeLabels[type] || type} · {courseName}
        </p>
      </div>
      <ExternalLink className={cn("w-3.5 h-3.5 shrink-0", isMine ? "text-primary-foreground/50" : "text-muted-foreground")} />
    </motion.button>
  );
};

export default ResourceLinkCard;
