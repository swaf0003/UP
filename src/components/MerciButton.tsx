import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MerciButtonProps {
  messageId: string;
  receiverId: string;
  totalStars?: number;
  isGiven?: boolean;
  starsLeftToday?: number;
  onStarGiven?: (messageId: string) => void;
  className?: string;
}

/**
 * Zero-query-on-mount MerciButton — reads pre-batched star state from parent useBatchThanks().
 */
const MerciButton = ({
  messageId,
  receiverId,
  totalStars = 0,
  isGiven = false,
  starsLeftToday = 3,
  onStarGiven,
  className,
}: MerciButtonProps) => {
  const { user } = useAuthContext();
  const [localGiven, setLocalGiven] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user || user.id === receiverId) return null;

  const given = isGiven || localGiven;
  const displayTotal = totalStars + (localGiven && !isGiven ? 1 : 0);

  const handleGiveStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (given || loading) return;

    if (starsLeftToday <= 0) {
      toast.info("Tu as déjà donné tes 3 étoiles aujourd'hui ! Reviens demain.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("thanks").insert({
      sender_id: user.id,
      receiver_id: receiverId,
      message_id: messageId,
    });

    if (error) {
      if (error.code === "23505") {
        setLocalGiven(true);
      } else {
        toast.error(error.message || "Limite d'étoiles atteinte aujourd'hui !");
      }
    } else {
      setLocalGiven(true);
      onStarGiven?.(messageId);
      const remaining = Math.max(0, starsLeftToday - 1);
      toast.success(
        `Étoile donnée ! (${remaining} restante${remaining > 1 ? "s" : ""} aujourd'hui)`
      );
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleGiveStar}
      disabled={given || loading}
      title={
        given
          ? "Étoile donnée"
          : `Donner une étoile (${starsLeftToday}/3 restantes aujourd'hui)`
      }
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[0.65rem] font-medium transition-colors",
        given
          ? "bg-warning/15 text-warning border border-warning/30"
          : "bg-secondary/60 text-muted-foreground hover:text-warning hover:bg-warning/10 border border-transparent",
        className
      )}
    >
      <Star className={cn("w-3 h-3", given && "fill-warning text-warning")} />
      {displayTotal > 0 && <span className="font-mono">{displayTotal}</span>}
    </button>
  );
};

export default MerciButton;
