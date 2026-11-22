import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users, Shield, Crown, MessageCircle, Hash, Trash2, Plus, ArrowLeft,
  Search, Loader2, BookOpen, ChevronRight, BarChart3, Eye, Calendar,
  TrendingUp, Activity, Database, Mail, GraduationCap, Building2, Star,
  FileText, Filter, SortAsc, SortDesc, RefreshCw, ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

import { UNIVERSITY_NAMES as universityNames, FACULTIES as faculties, ACADEMIC_YEARS as years } from "@/shared/constants/universities";

const universities = Object.entries(universityNames).map(([id, name]) => ({ id, name }));

interface UserRow {
  user_id: string;
  display_name: string;
  university: string;
  faculty: string;
  academic_year: string;
  avatar_url: string | null;
  created_at: string;
  role: string | null;
  email_verified: boolean;
}

interface CourseRow {
  id: string;
  name: string;
  short_name: string;
  code: string;
  faculty: string;
  university_id: string;
  year: string;
  memberCount: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };

type AdminSection = "overview" | "users" | "courses" | "resources" | "activity";

const AdminPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { isAdmin, isOwner, loading: roleLoading } = useAdmin();
  const [section, setSection] = useState<AdminSection>("overview");
  const [searchUsers, setSearchUsers] = useState("");
  const [searchCourses, setSearchCourses] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [roleDialog, setRoleDialog] = useState<UserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<CourseRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", short_name: "", code: "", faculty: "", university_id: "", year: "" });
  const [creating, setCreating] = useState(false);
  const [userSortBy, setUserSortBy] = useState<"name" | "date" | "university">("name");
  const [filterFaculty, setFilterFaculty] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const [stats, setStats] = useState({
    totalUsers: 0, totalMessages: 0, totalCourses: 0, totalHubMessages: 0,
    totalResources: 0, totalContacts: 0, verifiedUsers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (roleLoading || !isAdmin) return;
    fetchAll();
  }, [roleLoading, isAdmin]);

  const fetchAll = async () => {
    setLoadingData(true);
    const [profilesRes, rolesRes, coursesRes, msgCount, hubMsgCount, resourceCount, contactCount] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, university, faculty, academic_year, avatar_url, created_at, email_verified"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("courses").select("id, name, short_name, code, faculty, university_id, year"),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("hub_messages").select("*", { count: "exact", head: true }),
      supabase.from("resources").select("*", { count: "exact", head: true }),
      supabase.from("contacts").select("*", { count: "exact", head: true }),
    ]);

    const roleMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));
    const userList: UserRow[] = (profilesRes.data || []).map((p: any) => ({
      ...p,
      role: roleMap.get(p.user_id) || null,
    }));
    setUsers(userList);

    // Batch member counts
    const { data: allMembers } = await supabase.from("hub_members").select("course_id");
    const memberCounts = new Map<string, number>();
    (allMembers || []).forEach((m: any) => {
      memberCounts.set(m.course_id, (memberCounts.get(m.course_id) || 0) + 1);
    });

    const courseList: CourseRow[] = (coursesRes.data || []).map((c: any) => ({
      ...c,
      memberCount: memberCounts.get(c.id) || 0,
    }));
    setCourses(courseList);

    setStats({
      totalUsers: userList.length,
      totalMessages: (msgCount.count || 0) + (hubMsgCount.count || 0),
      totalCourses: courseList.length,
      totalHubMessages: hubMsgCount.count || 0,
      totalResources: resourceCount.count || 0,
      totalContacts: contactCount.count || 0,
      verifiedUsers: userList.filter(u => u.email_verified).length,
    });

    // Fetch recent activity: latest hub messages + latest signups
    const { data: recentMsgs } = await supabase
      .from("hub_messages")
      .select("id, content, sender_id, course_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    const activity: any[] = [];
    
    // Add recent signups
    userList
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .forEach(u => {
        activity.push({
          type: "signup",
          id: `signup-${u.user_id}`,
          user_name: u.display_name || "Sans nom",
          user_id: u.user_id,
          avatar_url: u.avatar_url,
          university: u.university,
          created_at: u.created_at,
        });
      });

    // Add recent hub messages
    if (recentMsgs) {
      const senderIds = [...new Set(recentMsgs.map(m => m.sender_id))];
      const courseIds2 = [...new Set(recentMsgs.map(m => m.course_id))];
      const { data: senderProfiles } = senderIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", senderIds)
        : { data: [] };
      const { data: msgCourses } = courseIds2.length > 0
        ? await supabase.from("courses").select("id, short_name, name").in("id", courseIds2)
        : { data: [] };
      
      const senderMap = new Map((senderProfiles || []).map((p: any) => [p.user_id, p]));
      const courseMap2 = new Map((msgCourses || []).map((c: any) => [c.id, c]));

      recentMsgs.forEach(m => {
        const sender = senderMap.get(m.sender_id) as any;
        const course = courseMap2.get(m.course_id) as any;
        activity.push({
          type: "hub_message",
          id: `msg-${m.id}`,
          user_name: sender?.display_name || "Anonyme",
          user_id: m.sender_id,
          avatar_url: sender?.avatar_url,
          content: m.content.slice(0, 60),
          course_name: course?.short_name || course?.name || "Salon",
          created_at: m.created_at,
        });
      });
    }

    // Sort by date
    activity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRecentActivity(activity.slice(0, 12));

    setLoadingData(false);
  };

  const handleSetRole = async () => {
    if (!roleDialog) return;
    setSavingRole(true);
    let mutationError = null;
    if (selectedRole === "none") {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", roleDialog.user_id);
      mutationError = error;
    } else {
      const { data: existing, error: fetchErr } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", roleDialog.user_id);
      if (fetchErr) {
        mutationError = fetchErr;
      } else if (existing && existing.length > 0) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: selectedRole as "admin" | "moderator" | "user" })
          .eq("user_id", roleDialog.user_id);
        mutationError = error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: roleDialog.user_id, role: selectedRole as "admin" | "moderator" | "user" });
        mutationError = error;
      }
    }
    setSavingRole(false);
    if (mutationError) {
      toast.error(mutationError.message || "Erreur lors de la mise à jour du rôle");
      return;
    }
    toast.success("Rôle mis à jour !");
    setRoleDialog(null);
    fetchAll();
  };

  const handleDeleteCourse = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    const results = await Promise.all([
      supabase.from("hub_messages").delete().eq("course_id", deleteDialog.id),
      supabase.from("hub_members").delete().eq("course_id", deleteDialog.id),
      supabase.from("resources").delete().eq("course_id", deleteDialog.id),
    ]);
    const childErr = results.find((r) => r.error)?.error;
    if (childErr) {
      toast.error(childErr.message || "Erreur lors de la suppression des données du salon");
      setDeleting(false);
      return;
    }
    const { error } = await supabase.from("courses").delete().eq("id", deleteDialog.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message || "Erreur lors de la suppression du salon");
      return;
    }
    toast.success("Salon supprimé !");
    setDeleteDialog(null);
    fetchAll();
  };

  const handleCreateCourse = async () => {
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
    if (error) toast.error("Erreur de création");
    else {
      toast.success("Salon créé !");
      setShowCreateCourse(false);
      setCreateForm({ name: "", short_name: "", code: "", faculty: "", university_id: "", year: "" });
      fetchAll();
    }
    setCreating(false);
  };

  const getAvatarUrl = (url: string | null) => {
    if (!url || url === "") return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${url}`;
  };

  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const getTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days}j`;
    return date.toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
  };

  const getRoleBadge = (role: string | null) => {
    if (role === "owner") return <Badge className="gradient-primary border-0 text-[0.6rem] gap-1"><Crown className="w-2.5 h-2.5" /> Owner</Badge>;
    if (role === "admin") return <Badge variant="secondary" className="text-[0.6rem] gap-1 bg-accent/50"><Shield className="w-2.5 h-2.5" /> Admin</Badge>;
    if (role === "moderator") return <Badge variant="outline" className="text-[0.6rem] gap-1">Mod</Badge>;
    return null;
  };

  if (roleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) {
    return (
      <div className="text-center py-20 space-y-4">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-lg font-heading font-bold text-foreground">Accès refusé</p>
        <p className="text-sm text-muted-foreground">Tu n'as pas les permissions nécessaires.</p>
        <Button variant="outline" onClick={() => navigate("/")} className="rounded-xl">Retour</Button>
      </div>
    );
  }

  // Sort & filter users
  const sortedUsers = [...users]
    .filter(u => {
      if (filterFaculty !== "all" && u.faculty !== filterFaculty) return false;
      if (!searchUsers) return true;
      const q = searchUsers.toLowerCase();
      return u.display_name.toLowerCase().includes(q) || u.university.toLowerCase().includes(q) || u.faculty.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (userSortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (userSortBy === "university") return (a.university || "").localeCompare(b.university || "");
      return (a.display_name || "").localeCompare(b.display_name || "");
    });

  const filteredCourses = courses.filter(c => {
    if (!searchCourses) return true;
    const q = searchCourses.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.short_name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const sidebarItems: { id: AdminSection; icon: any; label: string }[] = [
    { id: "overview", icon: BarChart3, label: "Vue d'ensemble" },
    { id: "activity", icon: Activity, label: "Activité" },
    { id: "users", icon: Users, label: "Utilisateurs" },
    { id: "courses", icon: Hash, label: "Salons" },
    { id: "resources", icon: FileText, label: "Ressources" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold gradient-text">Administration</h1>
          <p className="text-xs text-muted-foreground">Panneau de contrôle · The Union Project</p>
        </div>
        <Button size="sm" variant="ghost" className="rounded-xl gap-1.5 text-xs" onClick={fetchAll} disabled={loadingData}>
          <RefreshCw className={cn("w-3.5 h-3.5", loadingData && "animate-spin")} /> Actualiser
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Nav */}
        <div className="hidden md:flex flex-col gap-1 w-52 shrink-0">
          {sidebarItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              onClick={() => setSection(item.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 text-sm",
                section === item.id
                  ? "glass ring-1 ring-primary/20 text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              )}
            >
              <item.icon className={cn("w-4 h-4", section === item.id && "text-primary")} />
              {item.label}
            </motion.button>
          ))}
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex gap-1.5 overflow-x-auto pb-3 mb-2 w-full -mx-1 px-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap text-xs font-medium transition-all shrink-0",
                section === item.id
                  ? "glass ring-1 ring-primary/20 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="md:ml-[13.5rem] space-y-6 mt-4 md:mt-0">
        <AnimatePresence mode="wait">
          {/* ─── OVERVIEW ─── */}
          {section === "overview" && (
            <motion.div key="overview" variants={stagger} initial="initial" animate="animate" exit={{ opacity: 0 }} className="space-y-6">
              {/* Stats Grid */}
              <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Utilisateurs", value: stats.totalUsers, icon: Users, color: "text-primary", trend: `${stats.verifiedUsers} vérifiés` },
                  { label: "Messages", value: stats.totalMessages, icon: MessageCircle, color: "text-info", trend: `${stats.totalHubMessages} dans les Hubs` },
                  { label: "Salons", value: stats.totalCourses, icon: Hash, color: "text-success", trend: `${courses.reduce((s, c) => s + c.memberCount, 0)} inscriptions` },
                  { label: "Ressources", value: stats.totalResources, icon: FileText, color: "text-warning", trend: `${stats.totalContacts} contacts` },
                ].map((s) => (
                  <motion.div
                    key={s.label}
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="glass rounded-2xl p-4 transition-shadow hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <s.icon className={cn("w-5 h-5", s.color)} />
                      <TrendingUp className="w-3 h-3 text-success" />
                    </div>
                    <p className="text-2xl font-heading font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    <p className="text-[0.6rem] text-muted-foreground/70 mt-1">{s.trend}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Quick access */}
              <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSection("users")}
                  className="glass rounded-2xl p-5 text-left group transition-shadow hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold text-foreground">Gérer les utilisateurs</h3>
                      <p className="text-xs text-muted-foreground">{stats.totalUsers} inscrits · Rôles, profils, données</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSection("courses")}
                  className="glass rounded-2xl p-5 text-left group transition-shadow hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center">
                      <Hash className="w-6 h-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold text-foreground">Gérer les salons</h3>
                      <p className="text-xs text-muted-foreground">{stats.totalCourses} salons · Créer, supprimer</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              </motion.div>

              {/* Recent Users */}
              <motion.div variants={fadeUp} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Derniers inscrits
                  </h3>
                  <button onClick={() => setSection("users")} className="text-xs text-primary font-medium hover:underline">Voir tous →</button>
                </div>
                <div className="space-y-2">
                  {users
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5)
                    .map((u) => {
                      const avatarUrl = getAvatarUrl(u.avatar_url);
                      return (
                        <motion.button
                          key={u.user_id}
                          whileHover={{ x: 4, backgroundColor: "hsl(var(--accent) / 0.3)" }}
                          onClick={() => navigate(`/user/${u.user_id}`)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center gradient-primary text-primary-foreground text-[0.6rem] font-bold shrink-0 ring-2 ring-background">
                            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : getInitials(u.display_name || "?")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-foreground truncate">{u.display_name || "Sans nom"}</p>
                              {getRoleBadge(u.role)}
                            </div>
                            <p className="text-[0.65rem] text-muted-foreground">{universityNames[u.university] || u.university} · {u.academic_year}</p>
                          </div>
                          <span className="text-[0.6rem] text-muted-foreground shrink-0">
                            {new Date(u.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        </motion.button>
                      );
                    })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── ACTIVITY FEED ─── */}
          {section === "activity" && (
            <motion.div key="activity" variants={stagger} initial="initial" animate="animate" exit={{ opacity: 0 }} className="space-y-4">
              <motion.div variants={fadeUp}>
                <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-primary" /> Activité récente
                </h2>
              </motion.div>

              {loadingData ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : recentActivity.length === 0 ? (
                <motion.div variants={fadeUp} className="text-center py-12 text-muted-foreground text-sm">
                  Aucune activité récente
                </motion.div>
              ) : (
                <motion.div variants={fadeUp} className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
                  
                  <div className="space-y-1">
                    {recentActivity.map((item, i) => {
                      const avatarUrl = getAvatarUrl(item.avatar_url);
                      const isSignup = item.type === "signup";
                      const timeAgo = getTimeAgo(new Date(item.created_at));
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-start gap-3 pl-2 py-2.5 relative"
                        >
                          {/* Timeline dot */}
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-background",
                            isSignup ? "bg-success/15" : "bg-info/15"
                          )}>
                            {isSignup
                              ? <Users className="w-3 h-3 text-success" />
                              : <MessageCircle className="w-3 h-3 text-info" />
                            }
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <motion.button
                                onClick={() => navigate(`/user/${item.user_id}`)}
                                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                              >
                                {item.user_name}
                              </motion.button>
                              <span className="text-xs text-muted-foreground">
                                {isSignup ? "s'est inscrit" : `a envoyé un message dans`}
                              </span>
                              {!isSignup && (
                                <Badge variant="outline" className="text-[0.6rem] px-1.5 py-0">{item.course_name}</Badge>
                              )}
                            </div>
                            {!isSignup && item.content && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                "{item.content}"
                              </p>
                            )}
                            {isSignup && item.university && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {universityNames[item.university] || item.university}
                              </p>
                            )}
                          </div>
                          
                          <span className="text-[0.6rem] text-muted-foreground/70 shrink-0 mt-0.5">{timeAgo}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {section === "users" && (
            <motion.div key="users" variants={stagger} initial="initial" animate="animate" exit={{ opacity: 0 }} className="space-y-4">
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher par nom, université..." value={searchUsers} onChange={e => setSearchUsers(e.target.value)} className="pl-10 rounded-xl glass border-border" />
                </div>
                <div className="flex gap-2">
                  <Select value={filterFaculty} onValueChange={setFilterFaculty}>
                    <SelectTrigger className="rounded-xl w-36 glass border-border">
                      <Filter className="w-3.5 h-3.5 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes facultés</SelectItem>
                      {faculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={userSortBy} onValueChange={(v: any) => setUserSortBy(v)}>
                    <SelectTrigger className="rounded-xl w-32 glass border-border">
                      <SortAsc className="w-3.5 h-3.5 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Nom</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="university">Université</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="text-xs text-muted-foreground">
                {sortedUsers.length} utilisateur{sortedUsers.length > 1 ? "s" : ""}
              </motion.div>

              {loadingData ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <motion.div variants={fadeUp} className="space-y-2">
                  {sortedUsers.map((u, i) => {
                    const avatarUrl = getAvatarUrl(u.avatar_url);
                    return (
                      <motion.div
                        key={u.user_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="glass rounded-xl overflow-hidden"
                      >
                        <div className="flex items-center gap-3 p-3.5">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={() => navigate(`/user/${u.user_id}`)}
                            className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center gradient-primary text-primary-foreground text-xs font-bold shrink-0 ring-2 ring-background shadow-md cursor-pointer"
                          >
                            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : getInitials(u.display_name || "?")}
                          </motion.button>

                          <motion.button
                            onClick={() => navigate(`/user/${u.user_id}`)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium text-foreground text-sm">{u.display_name || "Sans nom"}</p>
                              {getRoleBadge(u.role)}
                              {u.email_verified && (
                                <span className="text-[0.55rem] text-success bg-success/10 px-1.5 py-0.5 rounded-full">✓ Vérifié</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {universityNames[u.university] || u.university || "—"}
                              </span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">{u.faculty || "—"}</span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">{u.academic_year || "—"}</span>
                            </div>
                            <p className="text-[0.6rem] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              Inscrit le {new Date(u.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </motion.button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => navigate(`/user/${u.user_id}`)}
                              title="Voir le profil"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {isOwner && u.user_id !== user?.id && u.role !== "owner" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg text-xs h-8 gap-1"
                                onClick={() => { setRoleDialog(u); setSelectedRole(u.role || "none"); }}
                              >
                                <Shield className="w-3 h-3" /> Rôle
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── COURSES ─── */}
          {section === "courses" && (
            <motion.div key="courses" variants={stagger} initial="initial" animate="animate" exit={{ opacity: 0 }} className="space-y-4">
              <motion.div variants={fadeUp} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher un salon..." value={searchCourses} onChange={e => setSearchCourses(e.target.value)} className="pl-10 rounded-xl glass border-border" />
                </div>
                <Button onClick={() => setShowCreateCourse(true)} size="sm" className="rounded-xl gradient-primary text-primary-foreground gap-1.5 shrink-0">
                  <Plus className="w-4 h-4" /> Créer
                </Button>
              </motion.div>

              <motion.div variants={fadeUp} className="text-xs text-muted-foreground">
                {filteredCourses.length} salon{filteredCourses.length > 1 ? "s" : ""}
              </motion.div>

              {loadingData ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <motion.div variants={fadeUp} className="space-y-2">
                  {filteredCourses.map((c, i) => {
                    const isMed = c.faculty.toLowerCase().includes("méd") || c.faculty.toLowerCase().includes("med");
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="glass rounded-xl p-3.5 flex items-center gap-3"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          isMed ? "bg-destructive/10" : "gradient-accent"
                        )}>
                          <Hash className={cn("w-4 h-4", isMed ? "text-destructive" : "text-accent-foreground")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground text-sm truncate">{c.short_name || c.name}</p>
                            <Badge variant="outline" className="text-[0.55rem] shrink-0">{c.code}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {universityNames[c.university_id]} · {c.faculty} · {c.year} · <Users className="w-3 h-3 inline" /> {c.memberCount}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg h-9 w-9"
                          onClick={() => setDeleteDialog(c)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── RESOURCES ─── */}
          {section === "resources" && (
            <motion.div key="resources" variants={stagger} initial="initial" animate="animate" exit={{ opacity: 0 }} className="space-y-4">
              <motion.div variants={fadeUp} className="glass rounded-2xl p-6 text-center">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-heading font-semibold text-foreground mb-1">Gestion des ressources</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {stats.totalResources} ressource{stats.totalResources > 1 ? "s" : ""} dans l'Archive.
                  Gère les ressources directement depuis la page Archive.
                </p>
                <Button onClick={() => navigate("/resources")} className="rounded-xl gradient-primary text-primary-foreground gap-2">
                  <ExternalLink className="w-4 h-4" /> Ouvrir l'Archive
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── DIALOGS ─── */}

      {/* Role Dialog */}
      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Gérer le rôle</DialogTitle>
            <DialogDescription>{roleDialog?.display_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Rôle</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun rôle</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="moderator">Modérateur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setRoleDialog(null)}>Annuler</Button>
            <Button className="rounded-xl gradient-primary text-primary-foreground" onClick={handleSetRole} disabled={savingRole}>
              {savingRole ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Course Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-destructive">Supprimer le salon</DialogTitle>
            <DialogDescription>
              Es-tu sûr de vouloir supprimer <span className="font-medium text-foreground">{deleteDialog?.short_name || deleteDialog?.name}</span> ?
              Tous les messages et membres seront supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialog(null)}>Annuler</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDeleteCourse} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Course Dialog */}
      <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Créer un salon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du cours</Label>
              <Input value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Analyse Mathématique I" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Nom court</Label>
              <Input value={createForm.short_name} onChange={e => setCreateForm(p => ({ ...p, short_name: e.target.value }))} placeholder="Ex: Analyse I" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={createForm.code} onChange={e => setCreateForm(p => ({ ...p, code: e.target.value }))} placeholder="Ex: MATH-H1001" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Université</Label>
                <Select value={createForm.university_id} onValueChange={v => setCreateForm(p => ({ ...p, university_id: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Uni" /></SelectTrigger>
                  <SelectContent>{universities.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Faculté</Label>
                <Select value={createForm.faculty} onValueChange={v => setCreateForm(p => ({ ...p, faculty: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Fac" /></SelectTrigger>
                  <SelectContent>{faculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <Select value={createForm.year} onValueChange={v => setCreateForm(p => ({ ...p, year: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Année" /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowCreateCourse(false)}>Annuler</Button>
            <Button className="rounded-xl gradient-primary text-primary-foreground" onClick={handleCreateCourse} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminPage;
