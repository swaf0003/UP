import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, BookOpen, MessageCircle, Users, Mail, CalendarDays, Compass, User, Settings,
  GraduationCap, FileText, Hash, Loader2, Shield,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_LABELS } from "@/lib/navLabels";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { getUniversityShortName } from "@/shared/constants/universities";

export const OPEN_COMMAND_PALETTE_EVENT = "union:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}

const navItems = [
  { path: "/", label: NAV_LABELS["/"], icon: Home },
  { path: "/resources", label: NAV_LABELS["/resources"], icon: BookOpen },
  { path: "/chat", label: NAV_LABELS["/chat"], icon: MessageCircle },
  { path: "/tutoring", label: NAV_LABELS["/tutoring"], icon: GraduationCap },
  { path: "/messages", label: NAV_LABELS["/messages"], icon: Mail },
  { path: "/agenda", label: NAV_LABELS["/agenda"], icon: CalendarDays },
  { path: "/explore", label: NAV_LABELS["/explore"], icon: Compass },
  { path: "/union", label: NAV_LABELS["/union"], icon: Users },
  { path: "/profile", label: NAV_LABELS["/profile"], icon: User },
  { path: "/settings", label: NAV_LABELS["/settings"], icon: Settings },
];

interface SearchCourse {
  id: string;
  code: string;
  name: string;
  short_name: string;
  university_id: string;
  faculty: string;
}

interface SearchResource {
  id: string;
  title: string;
  type: string;
  course_id: string;
}

interface SearchProfile {
  user_id: string;
  display_name: string;
  university: string;
  faculty: string;
  academic_year: string;
}

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [courses, setCourses] = useState<SearchCourse[]>([]);
  const [resources, setResources] = useState<SearchResource[]>([]);
  const [students, setStudents] = useState<SearchProfile[]>([]);
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onCustom = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onCustom);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onCustom);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setCourses([]);
      setResources([]);
      setStudents([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const clean = trimmed.replace(/[(),.%*\\]/g, " ").trim();

    const timer = setTimeout(async () => {
      const [cRes, rRes, pRes] = await Promise.all([
        supabase
          .from("courses")
          .select("id, code, name, short_name, university_id, faculty")
          .or(`name.ilike.%${clean}%,code.ilike.%${clean}%,short_name.ilike.%${clean}%`)
          .limit(5),
        supabase
          .from("resources")
          .select("id, title, type, course_id")
          .ilike("title", `%${clean}%`)
          .limit(5),
        supabase
          .from("profiles")
          .select("user_id, display_name, university, faculty, academic_year")
          .ilike("display_name", `%${clean}%`)
          .limit(5),
      ]);

      if (cancelled) return;
      setCourses((cRes.data as SearchCourse[]) || []);
      setResources((rRes.data as SearchResource[]) || []);
      setStudents((pRes.data as SearchProfile[]) || []);
      setSearching(false);
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Rechercher un cours (MATH-F101), une synthèse, un étudiant..."
      />
      <CommandList>
        <CommandEmpty>
          {searching ? (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recherche en cours...
            </span>
          ) : (
            "Aucun résultat trouvé."
          )}
        </CommandEmpty>

        {resources.length > 0 && (
          <CommandGroup heading="L'Archive — Ressources">
            {resources.map((r) => (
              <CommandItem
                key={`res-${r.id}`}
                value={`res ${r.title}`}
                onSelect={() => go(`/resources?course=${r.course_id}&highlight=${r.id}`)}
              >
                <FileText className="mr-2 h-4 w-4 text-primary shrink-0" />
                <span className="truncate flex-1">{r.title}</span>
                <span className="text-[0.65rem] font-mono uppercase text-muted-foreground ml-2">
                  {r.type}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {courses.length > 0 && (
          <CommandGroup heading="Cours & Hubs">
            {courses.map((c) => (
              <CommandItem
                key={`course-${c.id}`}
                value={`course ${c.code} ${c.name} ${c.short_name}`}
                onSelect={() => go(`/chat?hub=${c.id}`)}
              >
                <Hash className="mr-2 h-4 w-4 text-primary shrink-0" />
                <span className="font-mono text-xs text-muted-foreground mr-2">{c.code}</span>
                <span className="truncate flex-1">{c.short_name || c.name}</span>
                <span className="text-[0.65rem] text-muted-foreground ml-2">
                  {getUniversityShortName(c.university_id)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {students.length > 0 && (
          <CommandGroup heading="Étudiants">
            {students.map((s) => (
              <CommandItem
                key={`user-${s.user_id}`}
                value={`student ${s.display_name} ${s.faculty}`}
                onSelect={() => go(`/user/${s.user_id}`)}
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{s.display_name}</span>
                <span className="text-[0.65rem] text-muted-foreground ml-2">
                  {getUniversityShortName(s.university)} · {s.faculty}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(resources.length > 0 || courses.length > 0 || students.length > 0) && <CommandSeparator />}

        <CommandGroup heading="Navigation">
          {navItems.map((item) => (
            <CommandItem key={item.path} value={item.label} onSelect={() => go(item.path)}>
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
          {isAdmin && (
            <CommandItem value="Administration" onSelect={() => go("/admin")}>
              <Shield className="mr-2 h-4 w-4 text-primary" />
              <span>Administration</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
