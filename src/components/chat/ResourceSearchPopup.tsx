import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Video, ClipboardList, BookOpen, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Resource {
  id: string;
  title: string;
  type: string;
  course_id: string;
  course_name: string;
}

interface ResourceSearchPopupProps {
  open: boolean;
  onClose: () => void;
  onSelect: (resource: Resource) => void;
}

const typeIcons: Record<string, any> = {
  pdf: FileText,
  video: Video,
  exam: ClipboardList,
  summary: BookOpen,
};

const ResourceSearchPopup = ({ open, onClose, onSelect }: ResourceSearchPopupProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); return; }
    // Load initial resources
    fetchResources("");
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => { if (open) fetchResources(query); }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchResources = async (search: string) => {
    setLoading(true);
    let q = supabase.from("resources").select("id, title, type, course_id").order("title").limit(20);
    if (search.trim()) {
      q = q.ilike("title", `%${search.trim()}%`);
    }
    const { data } = await q;
    if (!data) { setResults([]); setLoading(false); return; }

    const courseIds = [...new Set(data.map((r) => r.course_id))];
    const { data: courses } = courseIds.length > 0
      ? await supabase.from("courses").select("id, short_name, name").in("id", courseIds)
      : { data: [] };

    const courseMap = new Map((courses || []).map((c: any) => [c.id, c.short_name || c.name]));

    setResults(data.map((r) => ({
      ...r,
      course_name: courseMap.get(r.course_id) || "Cours",
    })));
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50 max-h-[50vh] flex flex-col"
        >
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher une ressource..."
              className="border-none bg-transparent shadow-none focus-visible:ring-0 h-8 text-sm px-0"
              autoFocus
            />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {loading && <p className="text-xs text-muted-foreground text-center py-4">Recherche...</p>}
            {!loading && results.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune ressource trouvée</p>
            )}
            {results.map((resource) => {
              const Icon = typeIcons[resource.type] || FileText;
              return (
                <motion.button
                  key={resource.id}
                  whileHover={{ backgroundColor: "hsl(var(--accent) / 0.5)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onSelect(resource); onClose(); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{resource.title}</p>
                    <p className="text-[0.65rem] text-muted-foreground">{resource.course_name}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResourceSearchPopup;
