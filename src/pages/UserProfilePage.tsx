import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, MessageCircle, Trophy, Users, Calendar, Mail, GraduationCap, Building2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchUnionScore, getRank } from "@/hooks/useUnionScore";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

const universityNames: Record<string, string> = {
  ulb: "ULB", uclouvain: "UCLouvain", uliege: "ULiège", umons: "UMons",
  unamur: "UNamur", uantwerpen: "UAntwerpen", ugent: "UGent", uhasselt: "UHasselt", vub: "VUB",
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ messagesSent: 0, starsReceived: 0, contactAdds: 0, hubsJoined: 0 });
  const [unionScore, setUnionScore] = useState(0);
  const [isContact, setIsContact] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      setLoading(true);
      const [profileRes, msgRes, hubRes, contactRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("sender_id", userId),
        supabase.from("hub_members").select("*", { count: "exact", head: true }).eq("user_id", userId),
        user ? supabase.from("contacts").select("id").eq("user_id", user.id).eq("contact_user_id", userId) : Promise.resolve({ data: [] }),
      ]);

      setProfile(profileRes.data);
      const scoreData = await fetchUnionScore(userId);
      setUnionScore(scoreData.score);
      setStats({
        messagesSent: msgRes.count || 0,
        starsReceived: scoreData.starsReceived,
        contactAdds: scoreData.contactAdds,
        hubsJoined: hubRes.count || 0,
      });
      setIsContact((contactRes.data || []).length > 0);
      setLoading(false);
    };
    fetch();
  }, [userId, user]);

  const handleAddContact = async () => {
    if (!user || !userId || userId === user.id) return;
    setAddingContact(true);
    const { error } = await supabase.from("contacts").insert({ user_id: user.id, contact_user_id: userId });
    if (!error) { setIsContact(true); toast.success("Ajouté à ton Union !"); }
    setAddingContact(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!profile) return <div className="text-center py-20"><p className="text-muted-foreground">Profil introuvable</p></div>;

  const avatarUrl = profile.avatar_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
    : null;
  const initials = (profile.display_name || "?").slice(0, 2).toUpperCase();
  const { rank, progress } = getRank(unionScore);

  return (
    <motion.div className="space-y-6" variants={stagger} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-heading font-bold text-foreground">Profil</h1>
      </motion.div>

      {/* Profile Hero */}
      <motion.div variants={fadeUp} className="glass rounded-3xl p-6 text-center relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full gradient-primary opacity-10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 w-28 h-28 rounded-full bg-accent opacity-15 blur-2xl" />

        <div className={cn(
          "w-24 h-24 rounded-full overflow-hidden mx-auto mb-3 ring-4 ring-background shadow-xl",
          !avatarUrl && "gradient-primary flex items-center justify-center"
        )}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary-foreground font-heading font-bold text-2xl">{initials}</span>
          )}
        </div>

        <h2 className="text-xl font-heading font-bold text-foreground">{profile.display_name}</h2>
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 mt-1">
          <Building2 className="w-3.5 h-3.5" />
          {universityNames[profile.university] || profile.university}
          {profile.faculty && ` · ${profile.faculty}`}
        </p>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 mt-0.5">
          <GraduationCap className="w-3.5 h-3.5" />
          {profile.academic_year}
        </p>

        {/* Union Score */}
        <div className="mt-4 inline-flex items-center gap-2 glass rounded-xl px-4 py-2 ring-1 ring-accent-foreground/10">
          <Trophy className="w-4 h-4 text-accent-foreground" />
          <span className="font-heading font-bold text-foreground">{unionScore}</span>
          <span className="text-xs text-muted-foreground">· {rank.icon} {rank.name}</span>
        </div>

        {/* Add to Union button */}
        {user && userId !== user.id && (
          <div className="mt-4">
            {isContact ? (
              <Badge className="bg-success/15 text-success border-0">✓ Dans ton Union</Badge>
            ) : (
              <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground" onClick={handleAddContact} disabled={addingContact}>
                <Users className="w-4 h-4 mr-1.5" />
                Ajouter à mon Union
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {/* Rank Progress */}
      <motion.div variants={fadeUp} className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">{rank.icon} {rank.name}</span>
          <span className="text-xs text-muted-foreground">{unionScore} pts</span>
        </div>
        <Progress value={progress} className="h-2" />
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
        {[
          { icon: Star, value: stats.starsReceived, label: "Étoiles", color: "text-points-gold" },
          { icon: MessageCircle, value: stats.messagesSent, label: "Messages", color: "text-accent-foreground" },
          { icon: Users, value: stats.contactAdds, label: "Unions", color: "text-accent-foreground" },
          { icon: GraduationCap, value: stats.hubsJoined, label: "Salons", color: "text-accent-foreground" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-3 text-center">
            <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
            <p className="text-lg font-heading font-bold text-foreground">{s.value}</p>
            <p className="text-[0.6rem] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Info */}
      <motion.div variants={fadeUp} className="glass rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-heading font-semibold text-foreground">Informations</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Membre depuis {new Date(profile.created_at).toLocaleDateString("fr-BE", { month: "long", year: "numeric" })}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserProfilePage;
