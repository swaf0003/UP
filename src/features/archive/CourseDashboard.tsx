import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, FileText, Video, Plus, Trash2, Star, MessageSquare, GraduationCap, Flag,
} from "lucide-react";
import YouTubePlayer from "@/components/YouTubePlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { sanitizeExternalUrl, getSignedStorageUrl } from "@/lib/urlValidation";
import type { Course } from "@/data/mockData";
import { AdminResourceDialog } from "@/components/AdminResourceDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSubjectMeta } from "./subjectMeta";

interface CourseDashboardProps {
  course: Course;
  faculty: string;
  onBack: () => void;
  isAdmin: boolean;
  highlightResourceId?: string | null;
  favoriteIds: Set<string>;
  onToggleFavorite: (resourceId: string) => void;
  onReportResource?: (resourceId: string, title: string) => void;
}

export function CourseDashboard({
  course,
  faculty,
  onBack,
  isAdmin,
  highlightResourceId,
  favoriteIds,
  onToggleFavorite,
  onReportResource,
}: CourseDashboardProps) {
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(false);
  const queryClient = useQueryClient();

  const videos = course.resources.filter((r) => r.type === "video");
  const pdfs = course.resources.filter((r) => r.type === "pdf");
  const meta = getSubjectMeta(course.name, course.shortName);
  const defaultTab =
    highlightResourceId && pdfs.some((p) => p.id === highlightResourceId)
      ? "documents"
      : videos.length === 0 && pdfs.length > 0
      ? "documents"
      : "videos";

  const handleDeleteResource = async (resourceId: string | undefined) => {
    if (!resourceId) {
      toast.error("Cette ressource ne peut pas être supprimée");
      return;
    }
    if (!confirm("Supprimer cette ressource ?")) return;
    const { error } = await supabase.from("resources").delete().eq("id", resourceId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Ressource supprimée ✓");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.12 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux cours
        </button>
        <div className="flex items-center gap-2">
          {course.dbId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/chat?hub=${course.dbId}`)}
              className="h-8 text-xs gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Discuter dans le Hub
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/tutoring?course=${encodeURIComponent(course.code)}`)}
            className="h-8 text-xs gap-1.5"
          >
            <GraduationCap className="w-3.5 h-3.5" /> Trouver un tuteur
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setAdminOpen(true)} className="h-8 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      {/* Course header */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <meta.icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[0.65rem] font-mono">
                {course.code}
              </Badge>
              <Badge variant="secondary" className="text-[0.6rem] font-mono">
                Q{course.semester} · {course.credits} ECTS
              </Badge>
            </div>
            <h1 className="text-lg font-heading font-semibold text-foreground">{course.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
          </div>
        </div>
      </div>

      {/* Tabs (Videos + Documents only — no non-functional quiz dead end) */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full bg-card border border-border rounded-lg p-1 h-auto">
          <TabsTrigger value="videos" className="flex-1 gap-1.5 rounded-md text-xs">
            <Video className="w-3.5 h-3.5" /> Vidéos
            <Badge variant="secondary" className="text-[0.6rem] ml-1 px-1.5 py-0 font-mono">
              {videos.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex-1 gap-1.5 rounded-md text-xs">
            <FileText className="w-3.5 h-3.5" /> Synthèses & Docs
            <Badge variant="secondary" className="text-[0.6rem] ml-1 px-1.5 py-0 font-mono">
              {pdfs.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-4 space-y-3">
          {videos.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-border space-y-2">
              <Video className="w-7 h-7 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Aucune vidéo disponible pour ce cours</p>
            </div>
          ) : (
            videos.map((v, i) => {
              const isHighlighted = Boolean(highlightResourceId && v.id === highlightResourceId);
              const isFav = Boolean(v.id && favoriteIds.has(v.id));
              return (
                <div
                  key={v.id || i}
                  className={cn(
                    "rounded-xl border bg-card p-4 space-y-2 transition-colors",
                    isHighlighted ? "border-primary ring-1 ring-primary/40" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{v.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {v.source && <Badge variant="secondary" className="text-[0.6rem]">{v.source}</Badge>}
                        {v.duration && <span className="text-xs font-mono text-muted-foreground">{v.duration}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {course.dbId && v.id && (
                        <button
                          onClick={() => navigate(`/chat?hub=${course.dbId}&resource=${v.id}`)}
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                          title="Discuter de cette ressource dans le Hub"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {v.id && onReportResource && (
                        <button
                          onClick={() => onReportResource(v.id!, v.title)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          title="Signaler ce contenu"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteResource(v.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      )}
                      {v.id && (
                        <button
                          onClick={() => onToggleFavorite(v.id!)}
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                          title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                          <Star className={cn("w-4 h-4", isFav ? "text-warning fill-warning" : "text-muted-foreground/40")} />
                        </button>
                      )}
                    </div>
                  </div>
                  <YouTubePlayer url={v.url} title={v.title} />
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-2.5">
          {pdfs.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-border space-y-2">
              <FileText className="w-7 h-7 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Aucune synthèse ou document disponible</p>
            </div>
          ) : (
            pdfs.map((d, i) => {
              const isHighlighted = Boolean(highlightResourceId && d.id === highlightResourceId);
              const isFav = Boolean(d.id && favoriteIds.has(d.id));
              return (
                <div
                  key={d.id || i}
                  className={cn(
                    "rounded-xl border bg-card p-3.5 flex items-center gap-3 transition-colors hover:border-primary/40",
                    isHighlighted ? "border-primary ring-1 ring-primary/40" : "border-border"
                  )}
                >
                  <a
                    href={sanitizeExternalUrl(d.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async (e) => {
                      if (d.url?.includes("/storage/v1/object/public/resources/")) {
                        e.preventDefault();
                        const signed = await getSignedStorageUrl("resources", d.url);
                        if (signed) window.open(signed, "_blank", "noopener,noreferrer");
                        else toast.error("Impossible d'ouvrir le fichier");
                      }
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {d.pages && <span className="text-xs font-mono text-muted-foreground">{d.pages} p.</span>}
                        <Badge variant="secondary" className="text-[0.6rem]">
                          {d.url?.includes("/storage/") ? "Télécharger" : "Ouvrir"}
                        </Badge>
                      </div>
                    </div>
                  </a>
                  <div className="flex items-center gap-1 shrink-0">
                    {course.dbId && d.id && (
                      <button
                        onClick={() => navigate(`/chat?hub=${course.dbId}&resource=${d.id}`)}
                        className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                        title="Discuter dans le Hub"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {d.id && onReportResource && (
                      <button
                        onClick={() => onReportResource(d.id!, d.title)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        title="Signaler ce document"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteResource(d.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    )}
                    {d.id && (
                      <button
                        onClick={() => onToggleFavorite(d.id!)}
                        className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                        title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                      >
                        <Star className={cn("w-4 h-4", isFav ? "text-warning fill-warning" : "text-muted-foreground/40")} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {isAdmin && course.dbId && (
        <AdminResourceDialog
          open={adminOpen}
          onOpenChange={setAdminOpen}
          universityId=""
          faculty={faculty}
          year=""
          courseId={course.dbId}
          courseName={course.name}
        />
      )}
    </motion.div>
  );
}
