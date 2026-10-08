import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Stethoscope, Wrench, ChevronRight,
  BookOpen, MessageCircle, Users, Compass, Sparkles, Heart,
  Sun, Moon, Sunrise, Sunset, Trophy, CalendarDays, Clock, MapPin,
  Mail, FileText, Video, HelpCircle, TrendingUp, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { fetchUnionScore, getRank } from "@/hooks/useUnionScore";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const universityNames: Record<string, string> = {
  ulb: "ULB", uclouvain: "UCLouvain", uliege: "ULiège", umons: "UMons",
  unamur: "UNamur", uantwerpen: "UAntwerpen", ugent: "UGent", uhasselt: "UHasselt", vub: "VUB",
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return { text: "Bonne nuit", icon: Moon, emoji: "🌙" };
  if (h < 12) return { text: "Bonjour", icon: Sunrise, emoji: "☀️" };
  if (h < 18) return { text: "Bon après-midi", icon: Sun, emoji: "👋" };
  return { text: "Bonsoir", icon: Sunset, emoji: "🌅" };
};

const quotes = [
  "Seul on va plus vite, ensemble on va plus loin. 🚀",
  "Chaque question posée est un pas vers la réussite. 💡",
  "Ton futur toi te remercie d'être ici aujourd'hui. 🎯",
  "Le génie c'est 1% d'inspiration et 99% de transpiration. 💪",
  "Chaque expert a d'abord été un débutant. 🌱",
  "Le café est mon copilote en blocus. ☕",
  "Tu n'es pas en retard, tu es en mode stratégique. 🧐",
];

interface JoinedHub {
  id: string;
  short_name: string;
  name: string;
  faculty: string;
  university_id: string;
  unreadish: number;
}

interface RecentResource {
  id: string;
  title: string;
  type: string;
  course_name: string;
  created_at: string;
}

interface RecentHubMessage {
  id: string;
  content: string;
  sender_name: string;
  course_name: string;
  created_at: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };

const resourceTypeIcon = (type: string) => {
  switch (type) {
    case "pdf": case "summary": return FileText;
    case "video": return Video;
    case "quiz": return HelpCircle;
    default: return BookOpen;
  }
};

const resourceTypeColor = (type: string) => {
  switch (type) {
    case "pdf": case "summary": return "bg-destructive/10 text-destructive";
    case "video": return "bg-info/10 text-info";
    case "quiz": return "bg-warning/10 text-warning";
    default: return "bg-primary/10 text-primary";
  }
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const [joinedHubs, setJoinedHubs] = useState<JoinedHub[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(getRank(0));
  const [recentResources, setRecentResources] = useState<RecentResource[]>([]);
  const [recentHubMessages, setRecentHubMessages] = useState<RecentHubMessage[]>([]);
  const greeting = getGreeting();
  const { getNextEvent } = useCalendarEvents();
  const nextEvent = getNextEvent();

  const displayName = profile?.display_name || "Étudiant";
  const firstName = displayName.split(" ")[0];
  const university = profile?.university ? universityNames[profile.university] || profile.university : null;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Parallel fetches
      const [membershipsRes, contactsRes, unreadRes, scoreData, resourcesRes] = await Promise.all([
        supabase.from("hub_members").select("course_id").eq("user_id", user.id),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", user.id).eq("read", false),
        fetchUnionScore(user.id),
        supabase.from("resources").select("id, title, type, created_at, course_id").order("created_at", { ascending: false }).limit(5),
      ]);

      setContactCount(contactsRes.count || 0);
      setUnreadDMs(unreadRes.count || 0);
      setMyScore(scoreData.score);
      setMyRank(getRank(scoreData.score));

      // Recent resources with course names
      if (resourcesRes.data && resourcesRes.data.length > 0) {
        const courseIds = [...new Set(resourcesRes.data.map(r => r.course_id))];
        const { data: courses } = await supabase.from("courses").select("id, short_name, name").in("id", courseIds);
        const courseMap = new Map(courses?.map(c => [c.id, c.short_name || c.name]) || []);
        setRecentResources(resourcesRes.data.map(r => ({
          id: r.id,
          title: r.title,
          type: r.type,
          course_name: courseMap.get(r.course_id) || "Cours",
          created_at: r.created_at,
        })));
      }

      // Joined hubs
      if (membershipsRes.data && membershipsRes.data.length > 0) {
        const courseIds = membershipsRes.data.map(m => m.course_id);
        const { data: courses } = await supabase
          .from("courses")
          .select("id, name, short_name, faculty, university_id")
          .in("id", courseIds);
        if (courses) {
          const withActivity = await Promise.all(courses.map(async (c) => {
            const { count } = await supabase
              .from("hub_messages")
              .select("*", { count: "exact", head: true })
              .eq("course_id", c.id);
            return { ...c, unreadish: count || 0 };
          }));
          withActivity.sort((a, b) => b.unreadish - a.unreadish);
          setJoinedHubs(withActivity.slice(0, 4));

          // Recent hub messages from user's hubs
          const { data: hubMsgs } = await supabase
            .from("hub_messages")
            .select("id, content, sender_id, course_id, created_at")
            .in("course_id", courseIds)
            .neq("sender_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);

          if (hubMsgs && hubMsgs.length > 0) {
            const senderIds = [...new Set(hubMsgs.map(m => m.sender_id))];
            const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", senderIds);
            const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
            const courseMap2 = new Map(courses.map(c => [c.id, c.short_name || c.name]));
            setRecentHubMessages(hubMsgs.map(m => ({
              id: m.id,
              content: m.content.length > 60 ? m.content.substring(0, 60) + "…" : m.content,
              sender_name: profileMap.get(m.sender_id) || "Étudiant",
              course_name: courseMap2.get(m.course_id) || "Salon",
              created_at: m.created_at,
            })));
          }
        }
      }
    };
    load();
  }, [user]);

  const quickActions = [
    { icon: MessageCircle, label: "Hub", path: "/chat", bg: "gradient-primary", iconColor: "text-primary-foreground" },
    { icon: BookOpen, label: "Archive", path: "/resources", bg: "bg-destructive/15", iconColor: "text-destructive" },
    { icon: Compass, label: "Explorer", path: "/explore", bg: "bg-info/15", iconColor: "text-info" },
    { icon: Users, label: "Union", path: "/union", bg: "bg-success/15", iconColor: "text-success" },
  ];

  return (
    <motion.div className="space-y-5 max-w-lg mx-auto" variants={stagger} initial="initial" animate="animate">
      
      {/* ── Hero ── */}
      <motion.section variants={fadeUp} className="relative overflow-hidden rounded-2xl p-5 md:p-6 border border-border/40" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full gradient-primary opacity-20 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-lg">{greeting.emoji}</span>
            <span className="text-xs text-muted-foreground">{greeting.text}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">{firstName}</h1>
          {university && <p className="text-xs text-muted-foreground mt-0.5">{university}</p>}
          <p className="text-xs text-muted-foreground/70 italic mt-2 max-w-xs">« {quote} »</p>
        </div>
      </motion.section>

      {/* ── Quick Actions ── */}
      <motion.section variants={fadeUp} className="grid grid-cols-4 gap-2.5">
        {quickActions.map((a, i) => (
          <motion.button
            key={a.path}
            onClick={() => navigate(a.path)}
            whileHover={{ scale: 1.06, y: -3 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            className="glass rounded-xl p-3 flex flex-col items-center gap-1.5 group"
          >
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", a.bg)}>
              <a.icon className={cn("w-[18px] h-[18px]", a.iconColor)} />
            </div>
            <span className="text-[0.6rem] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{a.label}</span>
          </motion.button>
        ))}
      </motion.section>

      {/* ── Unread DMs banner ── */}
      {unreadDMs > 0 && (
        <motion.button
          variants={fadeUp}
          onClick={() => navigate("/messages")}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center gap-3 glass rounded-xl p-3.5 group"
        >
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {unreadDMs} message{unreadDMs > 1 ? "s" : ""} non lu{unreadDMs > 1 ? "s" : ""}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </motion.button>
      )}

      {/* ── Next Event ── */}
      {nextEvent && (
        <motion.button
          variants={fadeUp}
          onClick={() => navigate("/agenda")}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full glass rounded-xl p-3.5 text-left group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            <span className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wide">Prochain cours</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-sm font-heading font-semibold text-foreground truncate">{nextEvent.title}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {format(new Date(nextEvent.start_time), "EEE d MMM · HH:mm", { locale: fr })}
            </span>
            {nextEvent.location && (
              <span className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {nextEvent.location}
              </span>
            )}
          </div>
        </motion.button>
      )}

      {/* ── Stats strip ── */}
      <motion.section variants={fadeUp} className="grid grid-cols-3 gap-2.5">
        <motion.button
          onClick={() => navigate("/union")}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="glass rounded-xl p-3.5 flex flex-col items-center gap-1"
        >
          <Heart className="w-4 h-4 text-destructive" />
          <span className="text-lg font-heading font-bold text-foreground">{contactCount}</span>
          <span className="text-[0.55rem] text-muted-foreground">Contacts</span>
        </motion.button>
        <motion.button
          onClick={() => navigate("/profile")}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="glass rounded-xl p-3.5 flex flex-col items-center gap-1"
        >
          <Trophy className="w-4 h-4 text-accent-foreground" />
          <span className="text-lg font-heading font-bold text-foreground">{myScore}</span>
          <span className="text-[0.55rem] text-muted-foreground">{myRank.rank.icon} {myRank.rank.name}</span>
        </motion.button>
        <motion.button
          onClick={() => navigate("/messages")}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="glass rounded-xl p-3.5 flex flex-col items-center gap-1"
        >
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-lg font-heading font-bold text-foreground">{unreadDMs}</span>
          <span className="text-[0.55rem] text-muted-foreground">Non lus</span>
        </motion.button>
      </motion.section>

      {/* ── Recent Resources ── */}
      {recentResources.length > 0 && (
        <motion.section variants={fadeUp} className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-warning" />
              <h2 className="text-sm font-heading font-semibold text-foreground">Dernières ressources</h2>
            </div>
            <button onClick={() => navigate("/resources")} className="text-[0.65rem] text-accent-foreground font-medium flex items-center gap-0.5 hover:underline">
              Voir tout <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {recentResources.map((res, i) => {
              const TypeIcon = resourceTypeIcon(res.type);
              const colorClass = resourceTypeColor(res.type);
              return (
                <motion.button
                  key={res.id}
                  onClick={() => navigate("/resources")}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-accent/30 transition-colors text-left"
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
                    <TypeIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{res.title}</p>
                    <p className="text-[0.55rem] text-muted-foreground">{res.course_name}</p>
                  </div>
                  <span className="text-[0.5rem] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(res.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── Recent Hub Activity ── */}
      {recentHubMessages.length > 0 && (
        <motion.section variants={fadeUp} className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              <h2 className="text-sm font-heading font-semibold text-foreground">Activité Hubs</h2>
            </div>
            <button onClick={() => navigate("/chat")} className="text-[0.65rem] text-accent-foreground font-medium flex items-center gap-0.5 hover:underline">
              Voir tout <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {recentHubMessages.map((msg, i) => (
              <motion.button
                key={msg.id}
                onClick={() => navigate("/chat")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.04 }}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-accent/30 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-foreground truncate">{msg.sender_name}</p>
                    <span className="text-[0.5rem] text-muted-foreground shrink-0">dans #{msg.course_name}</span>
                  </div>
                  <p className="text-[0.6rem] text-muted-foreground mt-0.5 truncate">{msg.content}</p>
                </div>
                <span className="text-[0.5rem] text-muted-foreground shrink-0 mt-0.5">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Joined Hubs ── */}
      {joinedHubs.length > 0 && (
        <motion.section variants={fadeUp} className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
              <h2 className="text-sm font-heading font-semibold text-foreground">Tes salons</h2>
            </div>
            <button onClick={() => navigate("/chat")} className="text-[0.65rem] text-accent-foreground font-medium flex items-center gap-0.5 hover:underline">
              Tous <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {joinedHubs.map((hub, i) => {
              const isMed = hub.faculty.toLowerCase().includes("méd") || hub.faculty.toLowerCase().includes("med");
              return (
                <motion.button
                  key={hub.id}
                  onClick={() => navigate("/chat")}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-accent/30 transition-colors text-left"
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isMed ? "bg-destructive/10" : "gradient-accent")}>
                    {isMed ? <Stethoscope className="w-3.5 h-3.5 text-destructive" /> : <Wrench className="w-3.5 h-3.5 text-accent-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{hub.short_name || hub.name}</p>
                    <p className="text-[0.55rem] text-muted-foreground">{universityNames[hub.university_id]}</p>
                  </div>
                  <span className="text-[0.55rem] text-muted-foreground">{hub.unreadish} msg</span>
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── Coming Soon ── */}
      <motion.section variants={fadeUp} className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-3.5 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Quiz</p>
            <p className="text-[0.55rem] text-muted-foreground leading-tight">Teste tes connaissances</p>
          </div>
          <span className="text-[0.5rem] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Bientôt</span>
        </div>
        <div className="glass rounded-xl p-3.5 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Classement</p>
            <p className="text-[0.55rem] text-muted-foreground leading-tight">Compare avec les autres</p>
          </div>
          <span className="text-[0.5rem] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Bientôt</span>
        </div>
        <div className="glass rounded-xl p-3.5 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-info" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Mentorat</p>
            <p className="text-[0.55rem] text-muted-foreground leading-tight">Trouve un mentor</p>
          </div>
          <span className="text-[0.5rem] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Bientôt</span>
        </div>
        <div className="glass rounded-xl p-3.5 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Carnet</p>
            <p className="text-[0.55rem] text-muted-foreground leading-tight">Planifie tes révisions</p>
          </div>
          <span className="text-[0.5rem] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Bientôt</span>
        </div>
      </motion.section>
    </motion.div>
  );
};

export default HomePage;
