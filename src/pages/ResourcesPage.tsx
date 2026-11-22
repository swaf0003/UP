import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Search, ChevronRight, X, Plus, BookOpen, Star } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Course } from "@/data/mockData";
import { useCourses } from "@/hooks/useCourses";
import { useAdmin } from "@/hooks/useAdmin";
import { AdminResourceDialog } from "@/components/AdminResourceDialog";
import { CourseDashboard } from "@/features/archive/CourseDashboard";
import { getSubjectMeta } from "@/features/archive/subjectMeta";
import { useFavorites } from "@/features/archive/useFavorites";
import { SubmitResourceDialog } from "@/features/archive/SubmitResourceDialog";
import { ReportContentDialog } from "@/shared/components/ReportContentDialog";
import { UNIVERSITIES, FACULTIES, ACADEMIC_YEARS } from "@/shared/constants/universities";

const ResourcesPage = () => {
  const { user, profile } = useAuthContext();
  const { isAdmin } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const { favoriteIds, toggleFavorite } = useFavorites(user?.id);

  const highlightId = searchParams.get("highlight");
  const courseParam = searchParams.get("course");

  const [selectedUni, setSelectedUni] = useState(profile?.university || "ulb");
  const [selectedFaculty, setSelectedFaculty] = useState(profile?.faculty || "Médecine");
  const [selectedYear, setSelectedYear] = useState(profile?.academic_year || "BA1");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: courses = [], isLoading } = useCourses(selectedUni, selectedFaculty, selectedYear);

  // Honor ?course= or ?highlight= deep links
  useEffect(() => {
    if (!courses.length) return;
    if (courseParam) {
      const match = courses.find((c) => c.dbId === courseParam || c.id === courseParam || c.code === courseParam);
      if (match) setSelectedCourse(match);
    } else if (highlightId) {
      const match = courses.find((c) => c.resources.some((r) => r.id === highlightId));
      if (match) setSelectedCourse(match);
    }
  }, [courses, courseParam, highlightId]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((c) => {
      if (onlyFavorites && !c.resources.some((r) => r.id && favoriteIds.has(r.id))) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.resources.some((r) => r.title.toLowerCase().includes(q))
      );
    });
  }, [courses, searchQuery, onlyFavorites, favoriteIds]);

  const activeCourse = useMemo(() => {
    if (!selectedCourse) return null;
    return courses.find((c) => c.id === selectedCourse.id) || selectedCourse;
  }, [courses, selectedCourse]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground tracking-tight">L'Archive</h1>
          <p className="text-xs text-muted-foreground">
            Synthèses, vidéos et supports de cours des universités belges
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeCourse?.dbId && (
            <Button size="sm" variant="outline" onClick={() => setSubmitOpen(true)} className="h-8 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Soumettre une synthèse
            </Button>
          )}
          {isAdmin && !activeCourse && (
            <Button size="sm" onClick={() => setAdminOpen(true)} className="h-8 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Nouveau cours
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeCourse ? (
          <CourseDashboard
            key={activeCourse.id}
            course={activeCourse}
            faculty={selectedFaculty}
            onBack={() => {
              setSelectedCourse(null);
              if (highlightId || courseParam) setSearchParams({});
            }}
            isAdmin={isAdmin}
            highlightResourceId={highlightId}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
            onReportResource={(id, title) => setReportTarget({ id, title })}
          />
        ) : (
          <div key="catalog" className="space-y-4">
            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Select value={selectedUni} onValueChange={setSelectedUni}>
                <SelectTrigger className="h-9 bg-card border-border text-xs">
                  <SelectValue placeholder="Université" />
                </SelectTrigger>
                <SelectContent>
                  {UNIVERSITIES.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.shortName} — {u.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                <SelectTrigger className="h-9 bg-card border-border text-xs">
                  <SelectValue placeholder="Faculté" />
                </SelectTrigger>
                <SelectContent>
                  {FACULTIES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-1 bg-card border border-border rounded-md p-0.5">
                {ACADEMIC_YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={cn(
                      "flex-1 rounded text-xs font-mono py-1.5 transition-colors",
                      selectedYear === y
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Search + Favorites toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un cours, un code (ex: MATH-F101) ou une synthèse..."
                  className="pl-9 h-9 bg-card border-border text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant={onlyFavorites ? "default" : "outline"}
                size="sm"
                onClick={() => setOnlyFavorites((v) => !v)}
                className="h-9 gap-1.5 text-xs shrink-0"
              >
                <Star className={cn("w-3.5 h-3.5", onlyFavorites && "fill-current")} />
                Favoris
              </Button>
            </div>

            {/* Courses Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
                ))}
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium text-foreground">Aucun cours trouvé</p>
                <p className="text-xs text-muted-foreground">
                  Essaie une autre université, faculté ou année académique.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCourses.map((course) => {
                  const meta = getSubjectMeta(course.name, course.shortName);
                  return (
                    <button
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <meta.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="outline" className="text-[0.6rem] font-mono px-1.5 py-0">
                            {course.code}
                          </Badge>
                          <span className="text-[0.65rem] font-mono text-muted-foreground">
                            {course.resources.length} ress.
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {course.shortName || course.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{course.name}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground shrink-0 mt-1" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {isAdmin && (
        <AdminResourceDialog
          open={adminOpen}
          onOpenChange={setAdminOpen}
          universityId={selectedUni}
          faculty={selectedFaculty}
          year={selectedYear}
        />
      )}

      {activeCourse?.dbId && (
        <SubmitResourceDialog
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          courseId={activeCourse.dbId}
          courseName={activeCourse.name}
        />
      )}

      <ReportContentDialog
        open={Boolean(reportTarget)}
        onOpenChange={(o) => !o && setReportTarget(null)}
        targetType="resource"
        targetId={reportTarget?.id || ""}
        targetLabel={reportTarget?.title}
      />
    </div>
  );
};

export default ResourcesPage;
