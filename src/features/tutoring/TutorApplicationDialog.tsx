import { useState } from "react";
import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { UNIVERSITIES, FACULTIES, ACADEMIC_YEARS } from "@/shared/constants/universities";
import { toast } from "sonner";

interface TutorApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorApplicationDialog({ open, onOpenChange }: TutorApplicationDialogProps) {
  const { user, profile } = useAuthContext();
  const [universityId, setUniversityId] = useState(profile?.university || "ulb");
  const [faculty, setFaculty] = useState(profile?.faculty || "Polytechnique");
  const [year, setYear] = useState(profile?.academic_year || "BA3");
  const [coursesInput, setCoursesInput] = useState("");
  const [hourlyRateEur, setHourlyRateEur] = useState("22");
  const [mode, setMode] = useState<"online" | "campus" | "both">("both");
  const [campusLocation, setCampusLocation] = useState("");
  const [gradeProofNote, setGradeProofNote] = useState("");
  const [motivation, setMotivation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    const courses = coursesInput
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    const rateEur = Number(hourlyRateEur);
    if (courses.length === 0) {
      toast.error("Indique au moins un code de cours (ex: MATH-F101)");
      return;
    }
    if (Number.isNaN(rateEur) || rateEur < 10 || rateEur > 150) {
      toast.error("Tarif horaire compris entre 10 € et 150 €");
      return;
    }
    if (motivation.trim().length < 20) {
      toast.error("Décris brièvement ton expérience pédagogique (min. 20 caractères)");
      return;
    }

    setSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("tutor_applications").insert({
      user_id: user.id,
      university_id: universityId,
      faculty,
      academic_year: year,
      courses,
      hourly_rate_cents: Math.round(rateEur * 100),
      mode,
      campus_location: campusLocation.trim().slice(0, 120),
      grade_proof_note: gradeProofNote.trim().slice(0, 200),
      motivation: motivation.trim().slice(0, 1000),
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Erreur lors de l'envoi de ta candidature");
      return;
    }

    toast.success("Candidature envoyée ! L'équipe Union Project vérifie ton parcours sous 48h.");
    setCoursesInput("");
    setGradeProofNote("");
    setMotivation("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-border bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Devenir Tuteur Vérifié
          </DialogTitle>
          <DialogDescription>
            Aide d'autres étudiants belges à réussir leurs examens. Commission transparente de 15% incluse (paiement sécurisé Stripe Connect).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Université</Label>
              <Select value={universityId} onValueChange={setUniversityId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIVERSITIES.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.shortName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Faculté</Label>
              <Select value={faculty} onValueChange={setFaculty}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACULTIES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Année</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACADEMIC_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Cours maîtrisés (codes séparés par des virgules)</Label>
            <Input
              value={coursesInput}
              onChange={(e) => setCoursesInput(e.target.value)}
              placeholder="ex: MATH-F101, PHYS-F102, LMAT1121"
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tarif horaire (€/h)</Label>
              <Input
                type="number"
                min={10}
                max={150}
                value={hourlyRateEur}
                onChange={(e) => setHourlyRateEur(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[0.65rem] text-muted-foreground font-mono">
                Net tuteur estimé : {(Number(hourlyRateEur || 0) * 0.85).toFixed(2)} €/h
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Format</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "online" | "campus" | "both")}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">En ligne & Sur campus</SelectItem>
                  <SelectItem value="online">En ligne uniquement</SelectItem>
                  <SelectItem value="campus">Sur campus uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode !== "online" && (
            <div className="space-y-1">
              <Label className="text-xs">Campus / Bibliothèque habituelle</Label>
              <Input
                value={campusLocation}
                onChange={(e) => setCampusLocation(e.target.value)}
                placeholder="ex: ULB Solbosch, LLN Place des Sciences, Sart Tilman"
                className="text-xs"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Notes obtenues / Justificatif académique</Label>
            <Input
              value={gradeProofNote}
              onChange={(e) => setGradeProofNote(e.target.value)}
              placeholder="ex: 18/20 en MATH-F101, Grande Distinction BA2"
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Présentation & pédagogie</Label>
            <Textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Explique ta méthode pour débloquer les étudiants avant les examens..."
              rows={3}
              maxLength={1000}
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-success/30 bg-success/5 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            <span>Badge « Tuteur Vérifié » attribué uniquement après validation manuelle par Union Project.</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Envoyer ma candidature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
