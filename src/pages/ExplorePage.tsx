import { useState, useEffect } from "react";
import { Search, GraduationCap, Heart, UserPlus, TrendingUp, Users, Hash, MessageCircle, Stethoscope, Wrench, Crown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { UNIVERSITY_NAMES as universityNames } from "@/shared/constants/universities";

interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string;
  university: string;
  faculty: string;
  academic_year: string;
  avatar_url: string | null;
  messageCount?: number;
  role?: string | null;
}

interface PopularHub {
  id: string;
  name: string;
  short_name: string;
  faculty: string;
  university_id: string;
  year: string;
  memberCount: number;
  messageCount: number;
}

const ExplorePage = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("students");
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [popularHubs, setPopularHubs] = useState<PopularHub[]>([]);
  const [contactIds, setContactIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Platform stats
  const [platformStats, setPlatformStats] = useState({ users: 0, messages: 0, hubs: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const [profilesRes, contactsRes, rolesRes, coursesRes, msgCountRes, hubMsgCountRes, allMsgsRes, allHubMsgsRes, hubMembersRes] = await Promise.all([
        supabase.from("profiles").select("id, user_id, display_name, university, faculty, academic_year, avatar_url"),
        user ? supabase.from("contacts").select("contact_user_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("courses").select("id, name, short_name, faculty, university_id, year"),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("hub_messages").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("sender_id"),
        supabase.from("hub_messages").select("sender_id"),
        supabase.from("hub_members").select("course_id"),
      ]);

      const roleMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));

      // Count messages per user in batch
      const msgPerUser = new Map<string, number>();
      (allMsgsRes.data || []).forEach((m: any) => {
        msgPerUser.set(m.sender_id, (msgPerUser.get(m.sender_id) || 0) + 1);
      });
      (allHubMsgsRes.data || []).forEach((m: any) => {
        msgPerUser.set(m.sender_id, (msgPerUser.get(m.sender_id) || 0) + 1);
      });

      if (profilesRes.data) {
        const userProfiles = (profilesRes.data as ProfileRow[])
          .filter((p) => p.user_id !== user?.id)
          .map((p) => ({
            ...p,
            messageCount: msgPerUser.get(p.user_id) || 0,
            role: roleMap.get(p.user_id) || null,
          }));
        userProfiles.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
        setProfiles(userProfiles);
      }

      if (contactsRes.data) {
        setContactIds(new Set(contactsRes.data.map((c: any) => c.contact_user_id)));
      }

      // Popular hubs - batch
      if (coursesRes.data) {
        const hubMemberCounts = new Map<string, number>();
        const hubMsgCounts = new Map<string, number>();
        (hubMembersRes.data || []).forEach((m: any) => {
          hubMemberCounts.set(m.course_id, (hubMemberCounts.get(m.course_id) || 0) + 1);
        });
        (allHubMsgsRes.data || []).forEach((m: any) => {
          hubMsgCounts.set(m.sender_id, 0); // just for counting
        });
        // Re-count hub messages properly
        const hubMsgPerCourse = new Map<string, number>();
        // We need course_id from hub_messages
        const { data: hubMsgsWithCourse } = await supabase.from("hub_messages").select("course_id");
        (hubMsgsWithCourse || []).forEach((m: any) => {
          hubMsgPerCourse.set(m.course_id, (hubMsgPerCourse.get(m.course_id) || 0) + 1);
        });

        const hubsWithStats: PopularHub[] = coursesRes.data.map((c: any) => ({
          ...c,
          memberCount: hubMemberCounts.get(c.id) || 0,
          messageCount: hubMsgPerCourse.get(c.id) || 0,
        }));
        hubsWithStats.sort((a, b) => b.memberCount + b.messageCount - a.memberCount - a.messageCount);
        setPopularHubs(hubsWithStats.slice(0, 15));
      }

      setPlatformStats({
        users: profilesRes.data?.length || 0,
        messages: (msgCountRes.count || 0) + (hubMsgCountRes.count || 0),
        hubs: coursesRes.data?.length || 0,
      });

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const faculties = [...new Set(profiles.map((p) => p.faculty).filter(Boolean))];

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = p.display_name.toLowerCase().includes(search.toLowerCase()) ||
      p.university.toLowerCase().includes(search.toLowerCase());
    const matchesFaculty = !selectedFaculty || p.faculty === selectedFaculty;
    return matchesSearch && matchesFaculty;
  });

  const filteredHubs = popularHubs.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.short_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (profileUserId: string) => {
    if (!user) return;
    setAddingId(profileUserId);
    const { error } = await supabase.from("contacts").insert({ user_id: user.id, contact_user_id: profileUserId });
    if (error) toast.error("Erreur lors de l'ajout");
    else {
      setContactIds((prev) => new Set(prev).add(profileUserId));
      toast.success("Ajouté à ton Union !");
    }
    setAddingId(null);
  };

  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const getAvatarUrl = (profile: ProfileRow) => {
    if (profile.avatar_url && profile.avatar_url !== "") {
      if (profile.avatar_url.startsWith("http")) return profile.avatar_url;
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
    }
    return null;
  };

  const getRoleBadge = (role: string | null | undefined) => {
    if (role === "owner") return <Badge className="gradient-primary border-0 text-[0.55rem] px-1.5 py-0 gap-0.5"><Crown className="w-2.5 h-2.5" /> Owner</Badge>;
    if (role === "admin") return <Badge variant="secondary" className="text-[0.55rem] px-1.5 py-0 gap-0.5"><Shield className="w-2.5 h-2.5" /> Admin</Badge>;
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground mb-1">Explorer</h1>
        <p className="text-sm text-muted-foreground">Découvre la communauté Union Project</p>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: "Étudiants", value: platformStats.users },
          { icon: MessageCircle, label: "Messages", value: platformStats.messages },
          { icon: Hash, label: "Salons", value: platformStats.hubs },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-3 text-center">
            <s.icon className="w-4 h-4 text-accent-foreground mx-auto mb-1" />
            <p className="text-lg font-heading font-bold text-foreground">{s.value}</p>
            <p className="text-[0.6rem] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher étudiants, salons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 glass border-border h-12 rounded-xl"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-2 rounded-xl">
          <TabsTrigger value="students" className="rounded-lg gap-1.5 text-xs"><Users className="w-3.5 h-3.5" /> Étudiants</TabsTrigger>
          <TabsTrigger value="hubs" className="rounded-lg gap-1.5 text-xs"><TrendingUp className="w-3.5 h-3.5" /> Salons populaires</TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4 mt-4">
          {/* Faculty Filters */}
          {faculties.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge variant={selectedFaculty === null ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedFaculty(null)}>Toutes</Badge>
              {faculties.map(f => (
                <Badge key={f} variant={selectedFaculty === f ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedFaculty(selectedFaculty === f ? null : f)}>{f}</Badge>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground">{loading ? "Chargement..." : `${filteredProfiles.length} étudiant(s) — classés par activité`}</p>

          <div className="space-y-2">
            <AnimatePresence>
              {filteredProfiles.map((profile, i) => {
                const isContact = contactIds.has(profile.user_id);
                const avatarUrl = getAvatarUrl(profile);
                return (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass rounded-2xl p-4 flex items-center gap-3"
                  >
                    {/* Rank */}
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                      i === 0 ? "bg-[hsl(var(--points-gold))]/20 text-[hsl(var(--points-gold))]" :
                      i === 1 ? "bg-[hsl(var(--points-silver))]/20 text-[hsl(var(--points-silver))]" :
                      i === 2 ? "bg-[hsl(var(--points-bronze))]/20 text-[hsl(var(--points-bronze))]" :
                      "bg-muted text-muted-foreground"
                    )}>
                      #{i + 1}
                    </div>

                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center gradient-primary text-primary-foreground font-heading font-bold text-xs shrink-0">
                      {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : getInitials(profile.display_name || "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-foreground text-sm truncate">{profile.display_name || "Sans nom"}</p>
                        {getRoleBadge(profile.role)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{universityNames[profile.university] || profile.university} · {profile.faculty}</p>
                      <p className="text-[0.6rem] text-muted-foreground">{profile.messageCount || 0} messages · {profile.academic_year}</p>
                    </div>
                    {isContact ? (
                      <Badge className="bg-success/10 text-success border-success/20 shrink-0 gap-1 text-[0.6rem]">
                        <Heart className="w-3 h-3 fill-success" /> Union
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleAdd(profile.user_id)} disabled={addingId === profile.user_id} className="rounded-xl gradient-primary text-primary-foreground gap-1 text-xs shrink-0">
                        <UserPlus className="w-3.5 h-3.5" /> Ajouter
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {!loading && filteredProfiles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">Aucun étudiant trouvé</div>
            )}
          </div>
        </TabsContent>

        {/* Hubs Tab */}
        <TabsContent value="hubs" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">{loading ? "Chargement..." : `Top ${filteredHubs.length} salons les plus actifs`}</p>
          <div className="space-y-2">
            {filteredHubs.map((hub, i) => {
              const isMed = hub.faculty.toLowerCase().includes("méd") || hub.faculty.toLowerCase().includes("med");
              return (
                <motion.button
                  key={hub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate("/chat")}
                  className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:scale-[1.01] transition-all text-left"
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-[hsl(var(--points-gold))]/20 text-[hsl(var(--points-gold))]" :
                    i === 1 ? "bg-[hsl(var(--points-silver))]/20 text-[hsl(var(--points-silver))]" :
                    i === 2 ? "bg-[hsl(var(--points-bronze))]/20 text-[hsl(var(--points-bronze))]" :
                    "bg-muted text-muted-foreground"
                  )}>
                    #{i + 1}
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    isMed ? "bg-destructive/10" : "gradient-accent"
                  )}>
                    {isMed ? <Stethoscope className="w-4 h-4 text-destructive" /> : <Wrench className="w-4 h-4 text-accent-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{hub.short_name || hub.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{universityNames[hub.university_id]} · {hub.faculty} · {hub.year}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span className="text-xs">{hub.memberCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                      <MessageCircle className="w-3 h-3" />
                      <span className="text-xs">{hub.messageCount}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ExplorePage;
