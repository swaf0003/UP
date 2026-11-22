import { useState } from "react";
import { CalendarDays, Loader2, ShieldCheck } from "lucide-react";
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
import { toast } from "sonner";

export interface TutorListing {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  university_id: string;
  faculty: string;
  academic_year: string;
  bio: string;
  courses: string[];
  hourly_rate_cents: number;
  mode: "online" | "campus" | "both";
  campus_location: string;
  verified_tutor: boolean;
  verified_grade_note: string;
  rating_avg: number;
  review_count: number;
}

interface BookSessionDialogProps {
  tutor: TutorListing | null;
  onClose: () => void;
}

export function BookSessionDialog({ tutor, onClose }: BookSessionDialogProps) {
  const { user } = useAuthContext();
  const [courseCode, setCourseCode] = useState(tutor?.courses[0] || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState<"60" | "90" | "120">("60");
  const [mode, setMode] = useState<"online" | "campus">(tutor?.mode === "campus" ? "campus" : "online");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  if (!tutor) return null;

  const durationMin = Number(duration);
  const totalEur = ((tutor.hourly_rate_cents * durationMin) / 60 / 100).toFixed(2);
  const feeEur = ((tutor.hourly_rate_cents * durationMin * 0.15) / 60 / 100).toFixed(2);

  const handleBook = async () => {
    if (!user || !date || !time) {
      toast.error("Choisis une date et une heure pour la séance");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    setBooking(true);

    // Server-side trigger computes exact rate, 15% fee_bps, total_cents & locks payment_status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("tutor_bookings").insert({
      student_id: user.id,
      tutor_id: tutor.id,
      course_code: (courseCode || tutor.courses[0] || "GENERAL").trim().toUpperCase(),
      scheduled_at: scheduledAt,
      duration_minutes: durationMin,
      mode,
      notes: notes.trim().slice(0, 500),
      hourly_rate_cents: tutor.hourly_rate_cents,
      total_cents: Math.round((tutor.hourly_rate_cents * durationMin) / 60),
      platform_fee_cents: Math.round((tutor.hourly_rate_cents * durationMin * 0.15) / 60),
      payment_status: "pending_payment",
    });

    setBooking(false);
    if (error) {
      toast.error(error.message || "Impossible d'enregistrer la réservation");
      return;
    }

    toast.success("Demande de séance enregistrée ! Tu peux confirmer les détails par message avec ton tuteur.");
    onClose();
  };

  return (
    <Dialog open={Boolean(tutor)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Réserver avec {tutor.display_name}
          </DialogTitle>
          <DialogDescription>
            Tarif vérifié : <span className="font-mono text-foreground">{(tutor.hourly_rate_cents / 100).toFixed(0)} €/h</span> (frais de plateforme 15% inclus).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label className="text-xs">Cours concerné</Label>
            <Select value={courseCode || tutor.courses[0] || ""} onValueChange={setCourseCode}>
              <SelectTrigger className="h-9 text-xs font-mono"><SelectValue placeholder="Choisir un cours" /></SelectTrigger>
              <SelectContent>
                {tutor.courses.map((c) => (
                  <SelectItem key={c} value={c} className="font-mono">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Heure</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 text-xs font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Durée</Label>
              <Select value={duration} onValueChange={(v) => setDuration(v as "60" | "90" | "120")}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2 heures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Format</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "online" | "campus")}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tutor.mode !== "campus" && <SelectItem value="online">En ligne</SelectItem>}
                  {tutor.mode !== "online" && <SelectItem value="campus">Sur campus</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Chapitres / questions à préparer</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: Valeurs propres, exercices du TP4..."
              rows={2}
              maxLength={500}
              className="text-xs"
            />
          </div>

          {/* Transparent Pricing Breakdown */}
          <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total séance ({durationMin} min)</span>
              <span className="font-mono font-semibold text-foreground">{totalEur} €</span>
            </div>
            <div className="flex justify-between text-[0.68rem] text-muted-foreground">
              <span>Dont protection & frais Union Project (15%)</span>
              <span className="font-mono">{feeEur} €</span>
            </div>
            <p className="text-[0.65rem] text-muted-foreground pt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
              Paiement séquestré (Stripe Connect) — libéré après confirmation de la séance.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={booking}>
            Annuler
          </Button>
          <Button onClick={handleBook} disabled={booking || !date}>
            {booking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirmer la demande ({totalEur} €)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
