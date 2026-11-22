import { useState, useRef } from "react";
import { Upload, Loader2, X, ShieldCheck } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { isSafeHttpUrl } from "@/lib/urlValidation";
import { toast } from "sonner";

interface SubmitResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
}

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

export function SubmitResourceDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
}: SubmitResourceDialogProps) {
  const { user } = useAuthContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<"pdf" | "video">("pdf");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [certified, setCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast.error("Fichier trop lourd (max 20 Mo)");
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Formats acceptés : PDF, DOCX, PNG, JPG");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !certified) return;
    if (type === "video" && !isSafeHttpUrl(url.trim())) {
      toast.error("L'URL de la vidéo doit commencer par https://");
      return;
    }
    if (type === "pdf" && !file) {
      toast.error("Sélectionne un fichier PDF ou image");
      return;
    }

    setSubmitting(true);
    let finalUrl = url.trim();
    let filePath: string | null = null;

    if (type === "pdf" && file) {
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
      const path = `submissions/${user.id}/${courseId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("resources")
        .upload(path, file, { contentType: file.type });
      if (uploadErr) {
        toast.error("Erreur lors de l'upload du fichier.");
        setSubmitting(false);
        return;
      }
      filePath = path;
      finalUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/resources/${path}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("resources").insert({
      course_id: courseId,
      type,
      title: title.trim().slice(0, 160),
      url: finalUrl,
      file_path: filePath,
      status: "pending",
      submitted_by: user.id,
      original_work_certified: true,
    });

    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Erreur lors de la soumission");
      return;
    }

    toast.success("Synthèse soumise ! Elle sera publiée dans L'Archive après validation par un modérateur.");
    setTitle("");
    setUrl("");
    setFile(null);
    setCertified(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-heading">Soumettre une synthèse</DialogTitle>
          <DialogDescription>
            Cours : <span className="font-medium text-foreground">{courseName}</span>. Toute contribution est relue avant publication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("pdf")}
              className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                type === "pdf" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              Synthèse / PDF
            </button>
            <button
              type="button"
              onClick={() => setType("video")}
              className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                type === "video" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              Vidéo explicative
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input
              placeholder="ex: Synthèse complète — Valeurs propres & Diagonalisation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
            />
          </div>

          {type === "pdf" ? (
            <div>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" className="hidden" onChange={handleFile} />
              {file ? (
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-secondary/40 text-xs">
                  <span className="truncate font-medium">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full p-5 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Upload className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Choisir un fichier (max 20 Mo)</span>
                  <span>PDF, DOCX, PNG, JPG</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Lien YouTube (https://)</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          {/* Mandatory DSA / Copyright Certification */}
          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-secondary/30 cursor-pointer">
            <input
              type="checkbox"
              checked={certified}
              onChange={(e) => setCertified(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-success inline" />
                Je certifie être l'auteur original
              </strong>{" "}
              de cette synthèse ou partager une ressource libre de droits. Aucun slide de professeur ni examen protégé par droit d'auteur.
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !certified || !title.trim()}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Soumettre pour validation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
