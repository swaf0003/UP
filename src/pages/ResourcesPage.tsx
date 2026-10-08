import { useState, useMemo, useEffect, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope, Wrench, Play, FileText, ChevronRight,
  ArrowLeft, Lock, Search, Star, Heart, Activity, Microscope,
  BookOpen, Video, ClipboardList, X, FlaskConical,
  Sigma, Atom, Code, Cog, GraduationCap, Plus, Trash2
} from "lucide-react";
import YouTubePlayer from "@/components/YouTubePlayer";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { universities, curricula, type Course } from "@/data/mockData";
import { useCourses } from "@/hooks/useCourses";
import { useAdmin } from "@/hooks/useAdmin";
import { AdminResourceDialog } from "@/components/AdminResourceDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── Favorites ──────────────────────────────────────────────────────────────

const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setFavorites((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  return { favorites, toggle };
};

// ─── Subject icons + descriptions ───────────────────────────────────────────

const subjectMeta: Record<string, { icon: any; description: string }> = {
  "Anatomie": { icon: Heart, description: "Schémas, atlas et cas cliniques" },
  "Anatomie Générale": { icon: Heart, description: "Schémas, atlas et cas cliniques" },
  "Anatomie et physiologie": { icon: Heart, description: "Structure et fonctionnement du corps humain" },
  "Biochimie": { icon: FlaskConical, description: "Métabolisme et voies biochimiques" },
  "Biochimie Fondamentale": { icon: FlaskConical, description: "Métabolisme et voies biochimiques" },
  "Biochimie et biologie moléculaire": { icon: FlaskConical, description: "Réactions cellulaires et moléculaires" },
  "Physiologie": { icon: Activity, description: "Fonctions des systèmes corporels" },
  "Physiologie Humaine I": { icon: Activity, description: "Fonctions des systèmes corporels" },
  "Histologie": { icon: Microscope, description: "Tissus et structures cellulaires" },
  "Histologie et embryologie": { icon: Microscope, description: "Tissus et développement embryonnaire" },
  "Analyse": { icon: Sigma, description: "Calcul différentiel et intégral" },
  "Analyse I": { icon: Sigma, description: "Limites, dérivées et intégrales" },
  "Analyse Mathématique I": { icon: Sigma, description: "Calcul différentiel et intégral" },
  "Mathématiques discrètes et analyse": { icon: Sigma, description: "Logique, combinatoire et analyse" },
  "Analyse mathématique I": { icon: Sigma, description: "Calcul différentiel et intégral" },
  "Mathématiques II": { icon: Sigma, description: "Algèbre linéaire et séries" },
  "Physique": { icon: Atom, description: "Mécanique et thermodynamique" },
  "Physique I": { icon: Atom, description: "Mécanique classique et ondes" },
  "Physique Générale I": { icon: Atom, description: "Mécanique, fluides et thermodynamique" },
  "Physique générale I": { icon: Atom, description: "Mécanique, fluides et thermodynamique" },
  "Info": { icon: Code, description: "Programmation et algorithmes" },
  "Informatique": { icon: Code, description: "Programmation et structures de données" },
  "Informatique I": { icon: Code, description: "Introduction à la programmation" },
  "Introduction à l'informatique": { icon: Code, description: "Bases de la programmation" },
  "Chimie": { icon: FlaskConical, description: "Chimie générale et organique" },
  "Chimie Générale": { icon: FlaskConical, description: "Atomistique et réactions chimiques" },
  "Chimie et chimie physique": { icon: FlaskConical, description: "Thermochimie et cinétique" },
  "Projet": { icon: Cog, description: "Projet multidisciplinaire intégré" },
  "Projet I": { icon: Cog, description: "Projet multidisciplinaire intégré" },
  "Projets Multidisciplinaires I": { icon: Cog, description: "Travail en équipe et conception" },
  "E&M": { icon: Atom, description: "Champs électriques et magnétiques" },
  "Électricité & Magnétisme": { icon: Atom, description: "Champs électriques et magnétiques" },
  "Maths II": { icon: Sigma, description: "Algèbre linéaire et séries" },
};

const getSubjectMeta = (name: string, shortName: string) => {
  return subjectMeta[name] || subjectMeta[shortName] || { icon: BookOpen, description: "Ressources et supports de cours" };
};

// ─── Course Dashboard (3 tabs) ─────────────────────────────────────────────

const CourseDashboard = ({ course, faculty, onBack, isAdmin }: { course: Course; faculty: string; onBack: () => void; isAdmin: boolean }) => {
  const { favorites, toggle } = useFavorites();
  const [adminOpen, setAdminOpen] = useState(false);
  const queryClient = useQueryClient();
  const videos = course.resources.filter((r) => r.type === "video");
  const pdfs = course.resources.filter((r) => r.type === "pdf");
  const quizzes = course.resources.filter((r) => r.type === "quiz");
  const isMed = faculty === "Médecine";
  const meta = getSubjectMeta(course.name, course.shortName);

  const handleDeleteResource = async (resourceId: string | undefined) => {
    if (!resourceId) {
      toast({ title: "Impossible", description: "Cette ressource mock ne peut pas être supprimée", variant: "destructive" });
      return;
    }
    if (!confirm("Supprimer cette ressource ?")) return;
    const { error } = await supabase.from("resources").delete().eq("id", resourceId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ressource supprimée ✓" });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        {isAdmin && (
          <button
            onClick={() => setAdminOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium gradient-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une ressource
          </button>
        )}
      </div>

      {/* Course header */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl shrink-0",
            isMed ? "bg-destructive/10" : "gradient-accent"
          )}>
            <meta.icon className={cn("w-6 h-6", isMed ? "text-destructive" : "text-accent-foreground")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[0.65rem] font-mono">{course.code}</Badge>
              <Badge variant="secondary" className="text-[0.55rem]">Q{course.semester} · {course.credits} ECTS</Badge>
            </div>
            <h1 className="text-lg font-heading font-bold text-foreground">{course.name}</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="w-full glass rounded-xl p-1 h-auto">
          <TabsTrigger value="videos" className="flex-1 gap-1.5 rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground text-xs">
            <Video className="w-3.5 h-3.5" /> Vidéos <Badge variant="secondary" className="text-[0.55rem] ml-1 px-1.5 py-0">{videos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex-1 gap-1.5 rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground text-xs">
            <FileText className="w-3.5 h-3.5" /> Docs <Badge variant="secondary" className="text-[0.55rem] ml-1 px-1.5 py-0">{pdfs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex-1 gap-1.5 rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground text-xs">
            <ClipboardList className="w-3.5 h-3.5" /> Quiz <Badge variant="secondary" className="text-[0.55rem] ml-1 px-1.5 py-0">{quizzes.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-4 space-y-3">
          {videos.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Video className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Aucune vidéo disponible</p>
              {isAdmin && <p className="text-xs text-accent-foreground">Ajoute-en via le bouton ci-dessus</p>}
            </div>
          ) : videos.map((v, i) => (
            <div key={i} className="glass rounded-xl p-4 space-y-0 hover:scale-[1.005] transition-all">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/10 shrink-0">
                  <Play className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{v.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {v.duration && <span className="text-xs text-muted-foreground">{v.duration}</span>}
                    {v.source && <Badge variant="secondary" className="text-[0.55rem]">{v.source}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isAdmin && (
                    <button onClick={() => handleDeleteResource(v.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                  <button onClick={() => toggle(`v-${i}`)}>
                    <Star className={cn("w-4 h-4", favorites.has(`v-${i}`) ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                  </button>
                </div>
              </div>
              <YouTubePlayer url={v.url} title={v.title} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-3">
          {pdfs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Aucun document disponible</div>
          ) : pdfs.map((d, i) => (
            <div key={i} className="glass rounded-xl p-4 flex items-center gap-3 hover:scale-[1.01] transition-all">
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-accent shrink-0">
                  <FileText className="w-4 h-4 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {d.pages && <span className="text-xs text-muted-foreground">{d.pages} pages</span>}
                    <Badge variant="secondary" className="text-[0.55rem]">
                      {d.url?.includes('/storage/') ? 'Télécharger' : 'Ouvrir'}
                    </Badge>
                  </div>
                </div>
              </a>
              <div className="flex items-center gap-1.5 shrink-0">
                {isAdmin && (
                  <button onClick={() => handleDeleteResource(d.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
                <button onClick={() => toggle(`d-${i}`)}>
                  <Star className={cn("w-4 h-4", favorites.has(`d-${i}`) ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                </button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="quiz" className="mt-4 space-y-3">
          {quizzes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Aucun quiz disponible</div>
          ) : quizzes.map((q, i) => (
            <div key={i} className="glass rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-success/10 shrink-0">
                <ClipboardList className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{q.title}</p>
                {q.questions && <p className="text-xs text-muted-foreground">{q.questions} questions</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isAdmin && (
                  <button onClick={() => handleDeleteResource(q.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
                <button onClick={() => toggle(`q-${i}`)}>
                  <Star className={cn("w-4 h-4", favorites.has(`q-${i}`) ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                </button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Premium */}
      <div className="glass rounded-2xl p-5 opacity-70">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-heading font-semibold text-foreground">Préparation Examen Avancée</h2>
          <Badge className="text-[0.6rem] gradient-primary border-0">Premium</Badge>
        </div>
        <p className="text-sm text-muted-foreground">QCM chronométrés, examens blancs et coaching IA. Bientôt disponible.</p>
      </div>

      <AdminResourceDialog
        open={adminOpen}
        onOpenChange={setAdminOpen}
        universityId=""
        faculty={faculty}
        year=""
        courseId={course.id}
        courseName={course.name}
      />
    </motion.div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const ResourcesPage = () => {
  const [searchParams] = useSearchParams();
  const { profile } = useAuthContext();
  const facultyParam = searchParams.get("faculty");
  const initialFaculty: "Polytechnique" | "Médecine" =
    facultyParam === "polytech" ? "Polytechnique" : facultyParam === "medecine" ? "Médecine" : "Médecine";

  const [selectedUni, setSelectedUni] = useState("ulb");
  const [selectedFaculty, setSelectedFaculty] = useState<"Polytechnique" | "Médecine">(initialFaculty);
  const [selectedYear, setSelectedYear] = useState<"BA1" | "BA2" | "BA3">("BA1");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);

  // Pré-sélection automatique depuis le profil (université / faculté / année)
  const appliedProfile = useRef(false);
  useEffect(() => {
    if (appliedProfile.current || !profile) return;
    appliedProfile.current = true;

    if (profile.university && curricula.some((c) => c.universityId === profile.university)) {
      setSelectedUni(profile.university);
    }
    if (!facultyParam) {
      const f = (profile.faculty || "").toLowerCase();
      if (f.includes("poly")) setSelectedFaculty("Polytechnique");
      else if (f.includes("méd") || f.includes("med")) setSelectedFaculty("Médecine");
    }
    const digit = (profile.academic_year || "").match(/[123]/)?.[0];
    if (digit) setSelectedYear(`BA${digit}` as "BA1" | "BA2" | "BA3");

  }, [profile, facultyParam]);


  const { isAdmin } = useAdmin();
  const { data: dbCourses, isLoading } = useCourses(selectedUni, selectedFaculty, selectedYear);

  const uniData = useMemo(() => curricula.find((c) => c.universityId === selectedUni), [selectedUni]);
  const facultyData = useMemo(() => uniData?.faculties.find((f) => f.faculty === selectedFaculty), [uniData, selectedFaculty]);

  const allCourses = dbCourses || [];

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return allCourses;
    const q = searchQuery.toLowerCase();
    return allCourses.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.shortName.toLowerCase().includes(q)
    );
  }, [allCourses, searchQuery]);

  const availableUnis = universities.filter((u) => curricula.some((c) => c.universityId === u.id));

  const handleUniChange = (uniId: string) => {
    setSelectedUni(uniId);
    setSelectedCourse(null);
    const uni = curricula.find((c) => c.universityId === uniId);
    if (uni && !uni.faculties.some((f) => f.faculty === selectedFaculty)) {
      setSelectedFaculty(uni.faculties[0]?.faculty || "Polytechnique");
    }
    setSelectedYear("BA1");
  };

  const detailPane = (
    <AnimatePresence mode="wait">
      {selectedCourse ? (
        <CourseDashboard
          key={selectedCourse.id}
          course={selectedCourse}
          faculty={selectedFaculty}
          onBack={() => setSelectedCourse(null)}
          isAdmin={isAdmin}
        />
      ) : (
        <motion.div
          key="empty-detail"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl h-[60vh] flex flex-col items-center justify-center text-center gap-3 px-8"
        >
          <BookOpen className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">Sélectionne une matière</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Vidéos, documents et quiz du cours s'affichent ici.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="lg:flex lg:gap-6 lg:items-start">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "space-y-6 lg:w-[23rem] xl:w-[26rem] lg:shrink-0",
        selectedCourse && "hidden lg:block"
      )}
    >
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground mb-1">The Archive</h1>
          <p className="text-sm text-muted-foreground">Ressources organisées par faculté et matière</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setAdminOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium gradient-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" /> Soumettre une ressource
          </button>
        )}
      </div>

      {/* University picker */}
      <div className="flex gap-2 flex-wrap">
        {availableUnis.map((u) => (
          <button
            key={u.id}
            onClick={() => handleUniChange(u.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              selectedUni === u.id ? "gradient-primary text-primary-foreground shadow-lg" : "glass text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="w-4 h-4" /> {u.name}
          </button>
        ))}
      </div>

      {/* Faculty toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {(["Médecine", "Polytechnique"] as const).map((f) => {
            const hasFaculty = uniData?.faculties.some((fc) => fc.faculty === f);
            return (
              <button
                key={f}
                onClick={() => { if (hasFaculty) { setSelectedFaculty(f); setSelectedCourse(null); setSelectedYear("BA1"); } }}
                disabled={!hasFaculty}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  selectedFaculty === f ? "gradient-primary text-primary-foreground shadow-lg" : "glass text-muted-foreground hover:text-foreground",
                  !hasFaculty && "opacity-40 cursor-not-allowed"
                )}
              >
                {f === "Médecine" ? <Stethoscope className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                {f}
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5">
          {(["BA1", "BA2", "BA3"] as const).map((yr) => {
            const hasYear = facultyData?.years.some((y) => y.year === yr);
            return (
              <button
                key={yr}
                onClick={() => { if (hasYear) { setSelectedYear(yr); setSelectedCourse(null); } }}
                disabled={!hasYear}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  selectedYear === yr ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  !hasYear && "opacity-30 cursor-not-allowed"
                )}
              >
                {yr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search — only for non-admin or always shown */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par code ou nom de cours..."
          className="pl-11 rounded-2xl glass border-border h-12"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Course List — matching screenshot style */}
      <section className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
            {selectedFaculty === "Médecine" ? "Faculté de Médecine" : "École Polytechnique"} · Matières
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? `Aucun cours trouvé pour "${searchQuery}"` : "Aucun cours disponible pour cette sélection"}
            </p>
          </div>
        ) : (
          filteredCourses.map((course, i) => {
            const meta = getSubjectMeta(course.name, course.shortName);
            const isMed = selectedFaculty === "Médecine";

            return (
              <motion.button
                key={course.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                onClick={() => setSelectedCourse(course)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-5 hover:bg-accent/50 transition-all text-left",
                  (selectedCourse as Course | null)?.id === course.id && "bg-accent/60",
                  i < filteredCourses.length - 1 && "border-b border-border"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-xl shrink-0",
                  isMed ? "bg-destructive/10" : "gradient-accent"
                )}>
                  <meta.icon className={cn("w-5 h-5", isMed ? "text-destructive" : "text-accent-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{course.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {course.description || meta.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/40 shrink-0" />
              </motion.button>
            );
          })
        )}
      </section>

      {/* Premium Teaser */}
      <section className="glass rounded-2xl p-5 opacity-70">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-heading font-semibold text-foreground">Préparation Examen Avancée</h2>
          <Badge className="text-[0.6rem] gradient-primary border-0">Premium</Badge>
        </div>
        <p className="text-sm text-muted-foreground">QCM interactifs, examens blancs corrigés et coaching personnalisé. Bientôt disponible.</p>
      </section>

      {/* Admin Dialog */}
      <AdminResourceDialog
        open={adminOpen}
        onOpenChange={setAdminOpen}
        universityId={selectedUni}
        faculty={selectedFaculty}
        year={selectedYear}
      />
    </motion.div>

      <div className={cn("flex-1 min-w-0 mt-6 lg:mt-0", !selectedCourse && "hidden lg:block")}>
        {detailPane}
      </div>
    </div>
  );
};

export default ResourcesPage;
