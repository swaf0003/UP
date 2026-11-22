import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap, Search, ShieldCheck, Star, MapPin, Video, MessageSquare,
  CalendarDays, Plus, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UNIVERSITIES, FACULTIES, getUniversityShortName } from "@/shared/constants/universities";
import { TutorApplicationDialog } from "@/features/tutoring/TutorApplicationDialog";
import { BookSessionDialog, type TutorListing } from "@/features/tutoring/BookSessionDialog";

const TutoringPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCourse = searchParams.get("course") || "";

  const [search, setSearch] = useState(initialCourse);
  const [selectedUni, setSelectedUni] = useState("all");
  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [selectedMode, setSelectedMode] = useState("all");
  const [maxRate, setMaxRate] = useState("all");
  const [applyOpen, setApplyOpen] = useState(false);
  const [bookingTutor, setBookingTutor] = useState<TutorListing | null>(null);

  const { data: tutors = [], isLoading } = useQuery({
    queryKey: ["tutor-profiles"],
    queryFn: async (): Promise<TutorListing[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase as any)
        .from("tutor_profiles")
        .select("*")
        .eq("is_active", true)
        .order("verified_tutor", { ascending: false })
        .order("rating_avg", { ascending: false })
        .limit(60);

      if (error || !rows || rows.length === 0) return [];

      const userIds = rows.map((r: { user_id: string }) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return rows.map((r: TutorListing) => {
        const p = profileMap.get(r.user_id);
        return {
          ...r,
          display_name: p?.display_name || "Étudiant Tuteur",
          avatar_url: p?.avatar_url || null,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tutors.filter((t) => {
      if (selectedUni !== "all" && t.university_id !== selectedUni) return false;
      if (selectedFaculty !== "all" && t.faculty !== selectedFaculty) return false;
      if (selectedMode !== "all" && t.mode !== "both" && t.mode !== selectedMode) return false;
      if (maxRate !== "all" && t.hourly_rate_cents > Number(maxRate) * 100) return false;
      if (!q) return true;
      return (
        t.display_name.toLowerCase().includes(q) ||
        t.faculty.toLowerCase().includes(q) ||
        t.bio.toLowerCase().includes(q) ||
        t.courses.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [tutors, search, selectedUni, selectedFaculty, selectedMode, maxRate]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground tracking-tight flex items-center gap-2">
            Tutorat Étudiant
            <Badge variant="outline" className="text-[0.65rem] font-mono border-success/40 text-success">
              Vérifié .be
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trouve un étudiant qui a brillamment réussi ton cours. Tarifs transparents, frais plateforme 15% inclus.
          </p>
        </div>
        <Button size="sm" onClick={() => setApplyOpen(true)} className="h-9 text-xs gap-1.5 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Devenir Tuteur
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par code de cours (MATH-F101, LMAT1121), matière ou nom..."
            className="pl-9 h-9 bg-background border-border text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={selectedUni} onValueChange={setSelectedUni}>
            <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Université" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les universités</SelectItem>
              {UNIVERSITIES.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.shortName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
            <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Faculté" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les facultés</SelectItem>
              {FACULTIES.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMode} onValueChange={setSelectedMode}>
            <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Format" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">En ligne & Campus</SelectItem>
              <SelectItem value="online">En ligne</SelectItem>
              <SelectItem value="campus">Sur campus</SelectItem>
            </SelectContent>
          </Select>

          <Select value={maxRate} onValueChange={setMaxRate}>
            <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Budget max" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les tarifs</SelectItem>
              <SelectItem value="20">Max 20 €/h</SelectItem>
              <SelectItem value="30">Max 30 €/h</SelectItem>
              <SelectItem value="45">Max 45 €/h</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Directory */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-14 px-6 text-center space-y-3">
          <GraduationCap className="w-9 h-9 text-primary mx-auto opacity-80" />
          <div className="space-y-1 max-w-md mx-auto">
            <p className="text-sm font-medium text-foreground">
              Aucun tuteur vérifié ne correspond encore à ces critères
            </p>
            <p className="text-xs text-muted-foreground">
              Tu as brillamment réussi ce cours ? Postule dès maintenant pour devenir l'un des premiers tuteurs vérifiés de ta faculté.
            </p>
          </div>
          <Button size="sm" onClick={() => setApplyOpen(true)} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Postuler comme tuteur
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((tutor) => {
            const avatarUrl = tutor.avatar_url
              ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${tutor.avatar_url}`
              : null;
            return (
              <div
                key={tutor.id}
                className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-4 hover:border-primary/45 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={tutor.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-mono font-semibold text-primary">
                            {tutor.display_name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground truncate">{tutor.display_name}</p>
                          {tutor.verified_tutor && (
                            <ShieldCheck className="w-4 h-4 text-success shrink-0" title="Tuteur vérifié (.be + relevé validé)" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {getUniversityShortName(tutor.university_id)} · {tutor.faculty} · {tutor.academic_year}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-semibold text-foreground">
                        {(tutor.hourly_rate_cents / 100).toFixed(0)} €/h
                      </p>
                      {tutor.review_count > 0 && (
                        <p className="text-[0.65rem] font-mono text-muted-foreground inline-flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-warning fill-warning" />
                          {Number(tutor.rating_avg).toFixed(1)} ({tutor.review_count})
                        </p>
                      )}
                    </div>
                  </div>

                  {tutor.verified_grade_note && (
                    <div className="text-[0.7rem] text-success bg-success/10 border border-success/20 rounded-md px-2.5 py-1 font-medium">
                      ✓ {tutor.verified_grade_note}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground line-clamp-2">{tutor.bio}</p>

                  <div className="flex flex-wrap gap-1">
                    {tutor.courses.slice(0, 4).map((code) => (
                      <Badge key={code} variant="secondary" className="font-mono text-[0.65rem] px-1.5 py-0">
                        {code}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-[0.7rem] text-muted-foreground">
                    {tutor.mode !== "campus" && (
                      <span className="inline-flex items-center gap-1">
                        <Video className="w-3 h-3" /> En ligne
                      </span>
                    )}
                    {tutor.mode !== "online" && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" /> {tutor.campus_location || "Sur campus"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => navigate(`/messages/${tutor.user_id}`)}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Question
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setBookingTutor(tutor)}
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Réserver
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TutorApplicationDialog open={applyOpen} onOpenChange={setApplyOpen} />
      <BookSessionDialog tutor={bookingTutor} onClose={() => setBookingTutor(null)} />
    </div>
  );
};

export default TutoringPage;
