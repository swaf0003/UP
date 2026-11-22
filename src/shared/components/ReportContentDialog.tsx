import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ReportTargetType = "hub_message" | "direct_message" | "resource" | "profile" | "tutor";

interface ReportContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
}

const REASONS = [
  { value: "copyright", label: "Contenu protégé par droit d'auteur (slides/examen officiel)" },
  { value: "harassment", label: "Harcèlement ou propos abusifs" },
  { value: "spam", label: "Spam ou publicité non sollicitée" },
  { value: "inappropriate", label: "Contenu inapproprié ou illicite" },
  { value: "misinformation", label: "Erreur grave ou contenu trompeur" },
  { value: "other", label: "Autre motif" },
] as const;

export function ReportContentDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
}: ReportContentDialogProps) {
  const { user } = useAuthContext();
  const [reason, setReason] = useState<string>("copyright");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !targetId) return;
    setSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("content_reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim().slice(0, 1000),
    });
    setSubmitting(false);

    if (error) {
      toast.error("Impossible d'envoyer le signalement pour le moment.");
      return;
    }

    toast.success("Signalement transmis à l'équipe de modération (DSA). Merci.");
    setDetails("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" />
            Signaler un contenu
          </DialogTitle>
          <DialogDescription>
            {targetLabel
              ? `Signalement concernant : "${targetLabel}". Conformément au DSA européen, notre équipe examine chaque signalement rapidement.`
              : "Aide-nous à garder Union Project fiable, légal et respectueux."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Motif du signalement</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Précisions (optionnel)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Décris brièvement le problème..."
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
            Envoyer le signalement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
