import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Users, Hash, Stethoscope, Wrench, ArrowLeft, UserPlus, Heart, Loader2, Plus, LogIn, Crown, ChevronDown, GraduationCap, Building2, Star, Link2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import VoiceMessageBubble from "@/components/chat/VoiceMessageBubble";
import { useChatTheme } from "@/contexts/ChatThemeContext";
import DateSeparator from "@/components/chat/DateSeparator";
import MerciButton from "@/components/MerciButton";
import DeleteMessageDialog from "@/components/chat/DeleteMessageDialog";
import ResourceSearchPopup from "@/components/chat/ResourceSearchPopup";
import ResourceLinkCard from "@/components/chat/ResourceLinkCard";
import AiAssistant from "@/components/chat/AiAssistant";

interface CourseHub {
  id: string;
  name: string;
  short_name: string;
  code: string;
  faculty: string;
  university_id: string;
  year: string;
  messageCount: number;
  memberCount: number;
  lastMessage: string | null;
  isMember: boolean;
}

interface HubMessage {
  id: string;
  content: string;
  message_type: string;
  voice_url: string | null;
  voice_duration: number | null;
  created_at: string;
  sender_id: string;
  sender_name: string;
  sender_university: string;
  sender_faculty: string;
  sender_avatar: string | null;
}

const universityNames: Record<string, string> = {
  ulb: "ULB", uclouvain: "UCLouvain", uliege: "ULiège", umons: "UMons",
  unamur: "UNamur", uantwerpen: "UAntwerpen", ugent: "UGent", uhasselt: "UHasselt", vub: "VUB",
};

const universities = [
  { id: "ulb", name: "ULB" }, { id: "uclouvain", name: "UCLouvain" }, { id: "uliege", name: "ULiège" },
  { id: "umons", name: "UMons" }, { id: "unamur", name: "UNamur" }, { id: "vub", name: "VUB" },
  { id: "uantwerpen", name: "UAntwerpen" }, { id: "ugent", name: "UGent" }, { id: "uhasselt", name: "UHasselt" },
];

const faculties = ["Médecine", "Polytechnique"];
const years = ["BA1", "BA2", "BA3", "MA1", "MA2"];

const ChatPage = () => {
  const { user, profile } = useAuthContext();
  const { isAdmin, isOwner } = useAdmin();
  const { accent } = useChatTheme();
  const [selectedCourse, setSelectedCourse] = useState<CourseHub | null>(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "medecine" | "polytech">("all");
  const [hubs, setHubs] = useState<CourseHub[]>([]);
  const [hubMessages, setHubMessages] = useState<HubMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [addedContacts, setAddedContacts] = useState<Set<string>>(new Set());
  const [joinDialogHub, setJoinDialogHub] = useState<CourseHub | null>(null);
  const [joining, setJoining] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", short_name: "", code: "", faculty: "", university_id: "", year: "" });
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingMsg, setDeletingMsg] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showResourceSearch, setShowResourceSearch] = useState(false);

  const handleLongPressStart = useCallback((msgId: string, isMine: boolean) => {
    if (!isMine) return;
    longPressTimer.current = setTimeout(() => setDeleteTarget(msgId), 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleDeleteHubMessage = async () => {
    if (!deleteTarget) return;
    setDeletingMsg(true);
    const { error } = await supabase.from("hub_messages").delete().eq("id", deleteTarget);
    if (!error) {
      setHubMessages((prev) => prev.filter((m) => m.id !== deleteTarget));
      toast.success("Message supprimé");
    } else {
      toast.error("Erreur lors de la suppression");
    }
    setDeletingMsg(false);
    setDeleteTarget(null);
  };

  const fetchHubs = async () => {
    setLoading(true);
    const { data: courses } = await supabase
      .from("courses")
      .select("id, name, short_name, code, faculty, university_id, year");

    if (!courses || courses.length === 0) { setHubs([]); setLoading(false); return; }

    const courseIds = courses.map(c => c.id);

    // Batch queries instead of N+1
    const [memberCountsRes, msgCountsRes, myMembershipsRes] = await Promise.all([
      supabase.from("hub_members").select("course_id"),
      supabase.from("hub_messages").select("course_id, content").order("created_at", { ascending: false }),
      user ? supabase.from("hub_members").select("course_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
    ]);

    const memberCounts = new Map<string, number>();
    (memberCountsRes.data || []).forEach((m: any) => {
      memberCounts.set(m.course_id, (memberCounts.get(m.course_id) || 0) + 1);
    });

    const msgCounts = new Map<string, number>();
    const lastMessages = new Map<string, string>();
    (msgCountsRes.data || []).forEach((m: any) => {
      msgCounts.set(m.course_id, (msgCounts.get(m.course_id) || 0) + 1);
      if (!lastMessages.has(m.course_id)) lastMessages.set(m.course_id, m.content);
    });

    const myHubIds = new Set((myMembershipsRes.data || []).map((m: any) => m.course_id));

    const hubData: CourseHub[] = courses.map((course) => ({
      ...course,
      messageCount: msgCounts.get(course.id) || 0,
      memberCount: memberCounts.get(course.id) || 0,
      lastMessage: lastMessages.get(course.id) || null,
      isMember: myHubIds.has(course.id),
    }));

    setHubs(hubData);
    setLoading(false);
  };

  useEffect(() => { fetchHubs(); }, [user]);

  // Fetch messages for selected course + realtime
  useEffect(() => {
    if (!selectedCourse) return;

    const fetchMessages = async () => {
      const { data: messages } = await supabase
        .from("hub_messages")
        .select("*")
        .eq("course_id", selectedCourse.id)
        .order("created_at", { ascending: true });

      if (!messages) return;

      const senderIds = [...new Set(messages.map((m) => m.sender_id))];
      const { data: profiles } = senderIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, university, faculty, avatar_url").in("user_id", senderIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p] as [string, any]));

      setHubMessages(messages.map((m) => {
        const p = profileMap.get(m.sender_id) as any;
        return {
          id: m.id, content: m.content, message_type: m.message_type,
          voice_url: m.voice_url, voice_duration: m.voice_duration,
          created_at: m.created_at, sender_id: m.sender_id,
          sender_name: p?.display_name || "Anonyme",
          sender_university: p?.university || "",
          sender_faculty: p?.faculty || "",
          sender_avatar: p?.avatar_url || null,
        };
      }));
    };

    fetchMessages();

    const channel = supabase
      .channel(`hub-${selectedCourse.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "hub_messages",
        filter: `course_id=eq.${selectedCourse.id}`,
      }, async (payload) => {
        const msg = payload.new as any;
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, display_name, university, faculty, avatar_url")
          .eq("user_id", msg.sender_id)
          .single();

        setHubMessages((prev) => [...prev, {
          id: msg.id, content: msg.content, message_type: msg.message_type,
          voice_url: msg.voice_url, voice_duration: msg.voice_duration,
          created_at: msg.created_at, sender_id: msg.sender_id,
          sender_name: p?.display_name || "Anonyme",
          sender_university: p?.university || "",
          sender_faculty: p?.faculty || "",
          sender_avatar: p?.avatar_url || null,
        }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedCourse]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hubMessages]);

  const handleJoin = async (hub: CourseHub) => {
    if (!user) return;
    setJoining(true);
    const { error } = await supabase.from("hub_members").insert({ course_id: hub.id, user_id: user.id });
    if (!error) {
      toast.success(`Tu as rejoint ${hub.short_name || hub.name} !`);
      setJoinDialogHub(null);
      // Update hub in list
      setHubs((prev) => prev.map((h) => h.id === hub.id ? { ...h, isMember: true, memberCount: h.memberCount + 1 } : h));
      setSelectedCourse({ ...hub, isMember: true, memberCount: hub.memberCount + 1 });
    } else {
      toast.error("Erreur lors de l'inscription");
    }
    setJoining(false);
  };

  const handleHubClick = (hub: CourseHub) => {
    if (hub.isMember || isAdmin) {
      setSelectedCourse(hub);
    } else {
      setJoinDialogHub(hub);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !user || !selectedCourse) return;
    setSending(true);
    const { error } = await supabase.from("hub_messages").insert({
      course_id: selectedCourse.id,
      sender_id: user.id,
      content: message.trim(),
    });
    if (error) toast.error("Erreur d'envoi");
    else setMessage("");
    setSending(false);
  };

  const handleVoiceSend = async (blob: Blob, duration: number) => {
    if (!user || !selectedCourse) return;
    const filePath = `${user.id}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("voice-messages")
      .upload(filePath, blob, { contentType: "audio/webm" });
    if (uploadError) { toast.error("Erreur upload vocal"); return; }

    await supabase.from("hub_messages").insert({
      course_id: selectedCourse.id,
      sender_id: user.id,
      content: "🎤 Message vocal",
      message_type: "voice",
      voice_url: filePath,
      voice_duration: duration,
    });
  };

  const handleCreateSalon = async () => {
    if (!createForm.name || !createForm.code || !createForm.faculty || !createForm.university_id || !createForm.year) {
      toast.error("Remplis tous les champs");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("courses").insert({
      name: createForm.name,
      short_name: createForm.short_name || createForm.name,
      code: createForm.code,
      faculty: createForm.faculty,
      university_id: createForm.university_id,
      year: createForm.year,
      created_by: user?.id,
    });
    if (error) {
      toast.error("Erreur de création");
    } else {
      toast.success("Salon créé !");
      setShowCreateDialog(false);
      setCreateForm({ name: "", short_name: "", code: "", faculty: "", university_id: "", year: "" });
      fetchHubs();
    }
    setCreating(false);
  };

  const handleAddToUnion = async (contactUserId: string) => {
    if (!user || contactUserId === user.id) return;
    const { error } = await supabase.from("contacts").insert({ user_id: user.id, contact_user_id: contactUserId });
    if (!error) {
      setAddedContacts((prev) => new Set(prev).add(contactUserId));
      toast.success("Ajouté à ton Union !");
    }
  };

  const getInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const getAvatarUrl = (url: string | null) => {
    if (!url || url === "") return null;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${url}`;
  };
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });

  const filteredHubs = hubs.filter((h) => {
    if (filter === "all") return true;
    const f = h.faculty.toLowerCase();
    if (filter === "medecine") return f.includes("méd") || f.includes("med");
    return f.includes("poly");
  });

  // Group hubs: University → Faculty → Year
  const groupedHubs = useMemo(() => {
    const uniOrder = universities.map((u) => u.id);
    const yearOrder = ["BA1", "BA2", "BA3", "MA1", "MA2"];

    const grouped: Record<string, Record<string, Record<string, CourseHub[]>>> = {};

    for (const hub of filteredHubs) {
      const uniKey = hub.university_id;
      const facKey = hub.faculty;
      const yearKey = hub.year;
      if (!grouped[uniKey]) grouped[uniKey] = {};
      if (!grouped[uniKey][facKey]) grouped[uniKey][facKey] = {};
      if (!grouped[uniKey][facKey][yearKey]) grouped[uniKey][facKey][yearKey] = [];
      grouped[uniKey][facKey][yearKey].push(hub);
    }

    // Sort
    const sortedUnis = Object.keys(grouped).sort((a, b) => uniOrder.indexOf(a) - uniOrder.indexOf(b));
    return sortedUnis.map((uniId) => ({
      uniId,
      uniName: universityNames[uniId] || uniId,
      faculties: Object.keys(grouped[uniId]).sort().map((fac) => ({
        faculty: fac,
        years: Object.keys(grouped[uniId][fac])
          .sort((a, b) => yearOrder.indexOf(a) - yearOrder.indexOf(b))
          .map((year) => ({
            year,
            courses: grouped[uniId][fac][year].sort((a, b) => a.short_name.localeCompare(b.short_name)),
          })),
      })),
      totalMembers: Object.values(grouped[uniId]).flatMap((f) => Object.values(f).flat()).reduce((s, h) => s + h.memberCount, 0),
      totalCourses: Object.values(grouped[uniId]).flatMap((f) => Object.values(f).flat()).length,
    }));
  }, [filteredHubs]);

  // ── Join Dialog ──
  const JoinDialog = () => (
    <Dialog open={!!joinDialogHub} onOpenChange={() => setJoinDialogHub(null)}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-heading">
            Rejoindre le salon
          </DialogTitle>
        </DialogHeader>
        {joinDialogHub && (
          <div className="text-center space-y-4 py-4">
            <div className={cn(
              "w-16 h-16 rounded-2xl mx-auto flex items-center justify-center",
              (joinDialogHub.faculty.toLowerCase().includes("méd") || joinDialogHub.faculty.toLowerCase().includes("med"))
                ? "bg-destructive/10" : "gradient-accent"
            )}>
              {(joinDialogHub.faculty.toLowerCase().includes("méd") || joinDialogHub.faculty.toLowerCase().includes("med"))
                ? <Stethoscope className="w-7 h-7 text-destructive" />
                : <Wrench className="w-7 h-7 text-accent-foreground" />}
            </div>
            <div>
              <p className="font-heading font-bold text-foreground text-lg">{joinDialogHub.short_name || joinDialogHub.name}</p>
              <p className="text-sm text-muted-foreground">
                {universityNames[joinDialogHub.university_id]} · {joinDialogHub.faculty} · {joinDialogHub.year}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{joinDialogHub.memberCount} membre(s)</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Veux-tu rejoindre <span className="font-medium text-foreground">{joinDialogHub.short_name || joinDialogHub.name}</span> ?
              Tu pourras discuter avec tous les membres du salon.
            </p>
          </div>
        )}
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setJoinDialogHub(null)}>
            Annuler
          </Button>
          <Button
            className="flex-1 rounded-xl gradient-primary text-primary-foreground"
            onClick={() => joinDialogHub && handleJoin(joinDialogHub)}
            disabled={joining}
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
            Rejoindre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Create Salon Dialog (Admin) ──
  const CreateSalonDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Créer un salon</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du cours</Label>
            <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Analyse Mathématique I" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Nom court</Label>
            <Input value={createForm.short_name} onChange={(e) => setCreateForm((p) => ({ ...p, short_name: e.target.value }))} placeholder="Ex: Analyse I" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={createForm.code} onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value }))} placeholder="Ex: MATH-H1001" className="rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Université</Label>
              <Select value={createForm.university_id} onValueChange={(v) => setCreateForm((p) => ({ ...p, university_id: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Uni" /></SelectTrigger>
                <SelectContent>
                  {universities.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Faculté</Label>
              <Select value={createForm.faculty} onValueChange={(v) => setCreateForm((p) => ({ ...p, faculty: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Fac" /></SelectTrigger>
                <SelectContent>
                  {faculties.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Année</Label>
              <Select value={createForm.year} onValueChange={(v) => setCreateForm((p) => ({ ...p, year: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Année" /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
          <Button className="rounded-xl gradient-primary text-primary-foreground" onClick={handleCreateSalon} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Hub list ──
  if (!selectedCourse) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <JoinDialog />
        <CreateSalonDialog />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-1">The Hub</h1>
            <p className="text-sm text-muted-foreground">Salons par université, faculté et cours</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowCreateDialog(true)} size="sm" className="rounded-xl gradient-primary text-primary-foreground gap-1.5">
              <Plus className="w-4 h-4" /> Créer
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {[
            { key: "all" as const, label: "Tous", icon: Hash },
            { key: "medecine" as const, label: "Médecine", icon: Stethoscope },
            { key: "polytech" as const, label: "Polytech", icon: Wrench },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                filter === f.key ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
              )}
            >
              <f.icon className="w-3.5 h-3.5" /> {f.label}
            </button>
          ))}
        </div>

        {/* Mes Hubs - joined hubs quick access */}
        {!loading && hubs.filter(h => h.isMember).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-bold text-sm text-foreground">Mes Hubs</h2>
              <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">{hubs.filter(h => h.isMember).length}</Badge>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {hubs.filter(h => h.isMember).map((hub) => {
                const isMed = hub.faculty.toLowerCase().includes("méd") || hub.faculty.toLowerCase().includes("med");
                return (
                  <motion.button
                    key={`my-${hub.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setSelectedCourse(hub)}
                    className="shrink-0 glass rounded-2xl p-3 flex flex-col items-center gap-2 min-w-[5.5rem] max-w-[6rem] hover:scale-105 transition-all"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isMed ? "bg-destructive/10" : "gradient-accent"
                    )}>
                      {isMed
                        ? <Stethoscope className="w-5 h-5 text-destructive" />
                        : <Wrench className="w-5 h-5 text-accent-foreground" />}
                    </div>
                    <span className="text-[0.65rem] font-medium text-foreground text-center leading-tight truncate w-full">
                      {hub.short_name || hub.name}
                    </span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-2.5 h-2.5" />
                      <span className="text-[0.55rem]">{hub.memberCount}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        {!loading && hubs.filter(h => h.isMember).length > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-medium">Tous les salons</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement des salons...</p>
          </div>
        ) : filteredHubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center">
              <Hash className="w-7 h-7 text-accent-foreground" />
            </div>
            <h3 className="font-heading font-semibold text-foreground">Aucun salon disponible</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {isAdmin ? "Crée un premier salon pour démarrer la communauté !" : "Les salons seront bientôt disponibles."}
            </p>
            {isAdmin && (
              <Button onClick={() => setShowCreateDialog(true)} size="sm" className="rounded-xl gradient-primary text-primary-foreground gap-1.5 mt-2">
                <Plus className="w-4 h-4" /> Créer un salon
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedHubs.map((uni) => (
              <Collapsible key={uni.uniId} defaultOpen>
                <CollapsibleTrigger className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:scale-[1.005] transition-all group">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-heading font-bold text-foreground">{uni.uniName}</p>
                    <p className="text-xs text-muted-foreground">{uni.totalCourses} salon(s) · {uni.totalMembers} membre(s)</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 mt-2 space-y-3">
                    {uni.faculties.map((fac) => {
                      const isMedFac = fac.faculty.toLowerCase().includes("méd") || fac.faculty.toLowerCase().includes("med");
                      return (
                        <Collapsible key={fac.faculty} defaultOpen>
                          <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-accent/50 transition-colors group">
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                              isMedFac ? "bg-destructive/10" : "gradient-accent"
                            )}>
                              {isMedFac ? <Stethoscope className="w-3.5 h-3.5 text-destructive" /> : <Wrench className="w-3.5 h-3.5 text-accent-foreground" />}
                            </div>
                            <p className="font-medium text-sm text-foreground flex-1 text-left">{fac.faculty}</p>
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-4 mt-1 space-y-2">
                              {fac.years.map((yearGroup) => (
                                <div key={yearGroup.year}>
                                  <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                                    <GraduationCap className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{yearGroup.year}</p>
                                    <div className="flex-1 h-px bg-border" />
                                  </div>
                                  <div className="space-y-1.5">
                                    {yearGroup.courses.map((hub) => (
                                      <motion.button
                                        key={hub.id}
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onClick={() => handleHubClick(hub)}
                                        className="w-full glass rounded-xl p-3 flex items-center gap-3 hover:scale-[1.01] transition-all text-left"
                                      >
                                        <Hash className={cn("w-4 h-4 shrink-0", isMedFac ? "text-destructive/60" : "text-accent-foreground/60")} />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <p className="font-medium text-foreground text-sm truncate">{hub.short_name || hub.name}</p>
                                            {hub.isMember && (
                                              <Badge variant="secondary" className="text-[0.55rem] px-1 py-0 shrink-0">Rejoint</Badge>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {hub.lastMessage || "Aucun message encore"}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                                          <Users className="w-3 h-3" />
                                          <span className="text-xs">{hub.memberCount}</span>
                                        </div>
                                      </motion.button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // ── Chat room ──
  const isMed = selectedCourse.faculty.toLowerCase().includes("méd") || selectedCourse.faculty.toLowerCase().includes("med");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)]">
      {/* AI Assistant */}
      <AiAssistant courseId={selectedCourse.id} courseName={selectedCourse.short_name || selectedCourse.name} />
      {/* Header */}
      <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-3">
        <button onClick={() => { setSelectedCourse(null); setHubMessages([]); }} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
          isMed ? "bg-destructive/10" : "gradient-accent"
        )}>
          {isMed ? <Stethoscope className="w-4 h-4 text-destructive" /> : <Wrench className="w-4 h-4 text-accent-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-heading font-semibold text-foreground truncate">{selectedCourse.short_name || selectedCourse.name}</p>
            <Badge variant="outline" className="text-[0.6rem] px-1.5 py-0 shrink-0">
              {universityNames[selectedCourse.university_id]} · {selectedCourse.year}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{selectedCourse.faculty} · {selectedCourse.memberCount} membre(s)</p>
        </div>
        {isOwner && (
          <Badge className="gradient-primary border-0 text-[0.6rem] gap-1">
            <Crown className="w-3 h-3" /> Owner
          </Badge>
        )}
        {!isOwner && isAdmin && (
          <Badge variant="secondary" className="text-[0.6rem] gap-1">
            <Crown className="w-3 h-3" /> Admin
          </Badge>
        )}
      </div>

      <DeleteMessageDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteHubMessage}
        deleting={deletingMsg}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {hubMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
            <div className="text-4xl">💬</div>
            <p className="text-sm text-muted-foreground font-medium">Aucun message — lance la discussion !</p>
          </div>
        )}
        {hubMessages.map((msg, idx) => {
          const isMine = msg.sender_id === user?.id;
          const avatarUrl = getAvatarUrl(msg.sender_avatar);
          const prev = idx > 0 ? hubMessages[idx - 1] : null;
          const showDate = !prev || new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString();
          const consecutive = !showDate && prev && prev.sender_id === msg.sender_id &&
            (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 60000);

          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={msg.created_at} />}
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn("flex", isMine ? "justify-end" : "justify-start", consecutive ? "mt-0.5" : "mt-3")}
                onTouchStart={() => handleLongPressStart(msg.id, isMine || isAdmin)}
                onTouchEnd={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(msg.id, isMine || isAdmin)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onContextMenu={(e) => { if (isMine || isAdmin) { e.preventDefault(); setDeleteTarget(msg.id); } }}
              >
                <div className="flex items-end gap-2 max-w-[80%]">
                  {!isMine && !consecutive && (
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-muted text-[0.6rem] font-bold text-muted-foreground">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : getInitials(msg.sender_name)}
                      </div>
                      <button onClick={() => handleAddToUnion(msg.sender_id)} className="group" title="Ajouter à mon Union">
                        <AnimatePresence mode="wait">
                          {addedContacts.has(msg.sender_id) ? (
                            <motion.div key="added" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                              <Heart className="w-3 h-3 text-destructive fill-destructive" />
                            </motion.div>
                          ) : (
                            <motion.div key="add" whileHover={{ scale: 1.2 }}>
                              <UserPlus className="w-3 h-3 text-muted-foreground/50 group-hover:text-accent-foreground transition-colors" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                  )}
                  {!isMine && consecutive && <div className="w-8 shrink-0" />}

                  <div className={cn(
                    "px-3.5 py-2",
                    isMine
                      ? cn(accent.gradient, "text-white", consecutive ? "rounded-2xl rounded-tr-lg" : "rounded-2xl rounded-br-md")
                      : cn("bg-card border border-border/60", consecutive ? "rounded-2xl rounded-tl-lg" : "rounded-2xl rounded-bl-md")
                  )}>
                    {!isMine && !consecutive && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-xs font-semibold text-accent-foreground">{msg.sender_name}</p>
                        <span className="text-[0.5rem] text-muted-foreground">
                          {universityNames[msg.sender_university] || msg.sender_university} · {msg.sender_faculty}
                        </span>
                      </div>
                    )}
                    {msg.message_type === "voice" && msg.voice_url ? (
                      <VoiceMessageBubble
                        voiceUrl={msg.voice_url}
                        duration={msg.voice_duration || 0}
                        isMine={isMine}
                      />
                    ) : (() => {
                      // Parse resource links
                      const resourceRegex = /\[resource:([^:]+):([^:]+):([^:]+):([^\]]+)\]/g;
                      const parts: React.ReactNode[] = [];
                      let lastIndex = 0;
                      let match;
                      const content = msg.content;
                      let hasResource = false;
                      
                      while ((match = resourceRegex.exec(content)) !== null) {
                        hasResource = true;
                        if (match.index > lastIndex) {
                          parts.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
                        }
                        parts.push(
                          <ResourceLinkCard
                            key={match.index}
                            resourceId={match[1]}
                            title={match[2]}
                            type={match[3]}
                            courseName={match[4]}
                            isMine={isMine}
                          />
                        );
                        lastIndex = match.index + match[0].length;
                      }
                      
                      if (!hasResource) {
                        return <p className="text-[0.85rem] leading-relaxed whitespace-pre-wrap">{content}</p>;
                      }
                      
                      if (lastIndex < content.length) {
                        parts.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
                      }
                      
                      return <div className="text-[0.85rem] leading-relaxed whitespace-pre-wrap">{parts}</div>;
                    })()}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className={cn("text-[0.58rem]", isMine ? "text-white/60" : "text-muted-foreground")}>
                        {formatTime(msg.created_at)}
                      </p>
                      {!isMine && !consecutive && (
                        <MerciButton messageId={msg.id} senderId={msg.sender_id} source="hub" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="relative">
        <ResourceSearchPopup
          open={showResourceSearch}
          onClose={() => setShowResourceSearch(false)}
          onSelect={(resource) => {
            const linkTag = `[resource:${resource.id}:${resource.title}:${resource.type}:${resource.course_name}]`;
            setMessage((prev) => prev + linkTag);
          }}
        />
        <div className="flex items-end gap-2 p-2">
          <Button
            size="icon"
            variant="ghost"
            className="w-10 h-10 rounded-full shrink-0 text-muted-foreground hover:text-accent-foreground"
            onClick={() => setShowResourceSearch(!showResourceSearch)}
            title="Lier une ressource"
          >
            <Link2 className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex items-center gap-1.5 bg-card border border-border/60 rounded-2xl px-3 py-1.5">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Message..."
              className="border-none bg-transparent shadow-none focus-visible:ring-0 h-9 text-[0.85rem] px-1"
            />
          </div>
          <Button
            size="icon"
            className="w-10 h-10 rounded-full gradient-primary shrink-0 shadow-lg shadow-primary/20"
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatPage;
