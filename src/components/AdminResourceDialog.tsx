import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Video, FileText, ClipboardList, Loader2, Upload, File, X, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/urlValidation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  universityId: string;
  faculty: string;
  year: string;
  courseId?: string;
  courseName?: string;
}

const typeConfig = {
  video: { label: "Vidéo", icon: Video, color: "text-destructive" },
  pdf: { label: "Document", icon: FileText, color: "text-accent-foreground" },
  quiz: { label: "Quiz", icon: ClipboardList, color: "text-success" },
} as const;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
];

export const AdminResourceDialog = ({ open, onOpenChange, universityId, faculty, year, courseId, courseName }: Props) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"course" | "resource">(courseId ? "resource" : "course");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Course form
  const [courseCode, setCourseCode] = useState("");
  const [courseNameInput, setCourseNameInput] = useState("");
  const [shortName, setShortName] = useState("");
  const [credits, setCredits] = useState("5");
  const [semester, setSemester] = useState("1");

  // Resource form
  const [resourceType, setResourceType] = useState<"video" | "pdf" | "quiz">("video");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [pages, setPages] = useState("");
  const [questions, setQuestions] = useState("");
  const [source, setSource] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "file">(courseId ? "file" : "file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const resetForm = () => {
    setCourseCode(""); setCourseNameInput(""); setShortName(""); setCredits("5"); setSemester("1");
    setTitle(""); setUrl(""); setDuration(""); setPages(""); setQuestions(""); setSource("");
    setResourceType("video"); setSelectedFile(null); setInputMode("file"); setUploadProgress(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 20 Mo", variant: "destructive" });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Type non supporté", description: "Formats acceptés : PDF, DOC, DOCX, PPT, PPTX, PNG, JPG", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmitCourse = async () => {
    if (!courseCode.trim() || !courseNameInput.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("courses").insert({
      university_id: universityId,
      faculty,
      year,
      code: courseCode.trim(),
      name: courseNameInput.trim(),
      short_name: shortName.trim(),
      credits: parseInt(credits),
      semester: parseInt(semester),
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cours ajouté ✓" });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      resetForm();
      onOpenChange(false);
    }
  };

  const handleSubmitResource = async () => {
    if (!courseId || !title.trim()) return;
    // Video always uses URL mode
    const effectiveInputMode = resourceType === "video" ? "url" : inputMode;
    if (effectiveInputMode === "url" && !url.trim()) return;
    if (effectiveInputMode === "url" && !isSafeHttpUrl(url.trim())) {
      toast({ title: "URL invalide", description: "L'URL doit commencer par https:// ou http://", variant: "destructive" });
      return;
    }
    if (effectiveInputMode === "file" && !selectedFile) return;

    setLoading(true);
    let filePath: string | null = null;
    let finalUrl = url.trim();

    // Upload file if in file mode
    if (effectiveInputMode === "file" && selectedFile) {
      const rawExt = selectedFile.name.includes(".") ? selectedFile.name.split(".").pop()?.toLowerCase() : "bin";
      const safeExt = (rawExt || "bin").replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
      const path = `${courseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
      
      setUploadProgress(10);
      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(path, selectedFile, { contentType: selectedFile.type });

      if (uploadError) {
        toast({ title: "Erreur d'upload", description: uploadError.message, variant: "destructive" });
        setLoading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(80);
      filePath = path;
      finalUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/resources/${path}`;
      setUploadProgress(100);
    }

    const { error } = await supabase.from("resources").insert({
      course_id: courseId,
      type: resourceType,
      title: title.trim(),
      url: finalUrl,
      file_path: filePath,
      duration: duration || null,
      pages: pages ? parseInt(pages) : null,
      questions: questions ? parseInt(questions) : null,
      source: source || null,
    });

    setLoading(false);
    setUploadProgress(0);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ressource ajoutée ✓" });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      resetForm();
      onOpenChange(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") return "📄";
    if (file.type.includes("word")) return "📝";
    if (file.type.includes("presentation") || file.type.includes("powerpoint")) return "📊";
    if (file.type.startsWith("image/")) return "🖼️";
    return "📎";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {courseId ? `Ajouter une ressource` : "Ajouter un cours"}
          </DialogTitle>
          <DialogDescription>
            {courseId ? `Pour ${courseName}` : `${faculty} · ${year} · ${universityId.toUpperCase()}`}
          </DialogDescription>
        </DialogHeader>

        {!courseId && (
          <div className="flex gap-2 mb-2">
            <button onClick={() => setMode("course")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", mode === "course" ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground")}>
              Nouveau cours
            </button>
            <button className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all opacity-40 cursor-not-allowed")}>
              Ressource (sélectionnez un cours)
            </button>
          </div>
        )}

        {(mode === "course" && !courseId) ? (
          <div className="space-y-3">
            <Input placeholder="Code (ex: FSAB1101)" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} className="glass" />
            <Input placeholder="Nom complet du cours" value={courseNameInput} onChange={(e) => setCourseNameInput(e.target.value)} className="glass" />
            <Input placeholder="Nom court (ex: Analyse)" value={shortName} onChange={(e) => setShortName(e.target.value)} className="glass" />
            <div className="flex gap-2">
              <Input type="number" placeholder="Crédits" value={credits} onChange={(e) => setCredits(e.target.value)} className="glass flex-1" />
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger className="glass flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmitCourse} disabled={loading || !courseCode.trim() || !courseNameInput.trim()} className="w-full gradient-primary text-primary-foreground">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Ajouter le cours
            </Button>
          </div>
        ) : courseId ? (
          <div className="space-y-3">
            {/* Type selector */}
            <div className="flex gap-2">
              {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map((t) => {
                const cfg = typeConfig[t];
                const Icon = cfg.icon;
                return (
                  <button key={t} onClick={() => { setResourceType(t); if (t === "video") setInputMode("url"); }} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all", resourceType === t ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground")}>
                    <Icon className="w-3.5 h-3.5" /> {cfg.label}
                  </button>
                );
              })}
            </div>

            <Input placeholder="Titre de la ressource" value={title} onChange={(e) => setTitle(e.target.value)} className="glass" />

            {/* Input mode toggle for PDF/Quiz */}
            {resourceType !== "video" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setInputMode("file")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all",
                    inputMode === "file" ? "bg-accent text-accent-foreground" : "glass text-muted-foreground"
                  )}
                >
                  <Upload className="w-3.5 h-3.5" /> Uploader un fichier
                </button>
                <button
                  onClick={() => setInputMode("url")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all",
                    inputMode === "url" ? "bg-accent text-accent-foreground" : "glass text-muted-foreground"
                  )}
                >
                  <Link2 className="w-3.5 h-3.5" /> Coller un lien
                </button>
              </div>
            )}

            {/* File upload zone */}
            {inputMode === "file" && resourceType !== "video" ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {selectedFile ? (
                  <div className="glass rounded-xl p-3 flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(selectedFile)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} Mo</p>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full glass rounded-xl p-6 border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center gap-2 group"
                  >
                    <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Cliquer pour choisir un fichier</p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, PPT, PPTX, PNG, JPG (max 20 Mo)</p>
                  </button>
                )}

                {/* Upload progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full gradient-primary rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <Input placeholder={resourceType === "video" ? "URL de la vidéo (YouTube, etc.)" : "URL du fichier"} value={url} onChange={(e) => setUrl(e.target.value)} className="glass" />
            )}

            {resourceType === "video" && (
              <div className="flex gap-2">
                <Input placeholder="Durée (ex: 45min)" value={duration} onChange={(e) => setDuration(e.target.value)} className="glass flex-1" />
                <Input placeholder="Source (ex: YouTube)" value={source} onChange={(e) => setSource(e.target.value)} className="glass flex-1" />
              </div>
            )}
            {resourceType === "pdf" && (
              <Input type="number" placeholder="Nombre de pages" value={pages} onChange={(e) => setPages(e.target.value)} className="glass" />
            )}
            {resourceType === "quiz" && (
              <Input type="number" placeholder="Nombre de questions" value={questions} onChange={(e) => setQuestions(e.target.value)} className="glass" />
            )}

            <Button
              onClick={handleSubmitResource}
              disabled={loading || !title.trim() || (resourceType === "video" ? !url.trim() : (inputMode === "url" ? !url.trim() : !selectedFile))}
              className="w-full gradient-primary text-primary-foreground"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {loading && uploadProgress > 0 ? "Upload en cours..." : "Ajouter la ressource"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
