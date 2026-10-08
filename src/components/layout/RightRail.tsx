import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, BookOpen, Users, Sparkles, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useAuthContext } from "@/contexts/AuthContext";
import { useDetailPanel } from "./DetailPanel";
import { NAV_LABELS } from "@/lib/navLabels";

const universityNames: Record<string, string> = {
  ulb: "ULB", uclouvain: "UCLouvain", uliege: "ULiège", umons: "UMons",
  unamur: "UNamur", uantwerpen: "UAntwerpen", ugent: "UGent", uhasselt: "UHasselt", vub: "VUB",
};

const DefaultRail = () => {
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const { events } = useCalendarEvents();

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => new Date(e.end_time || e.start_time).getTime() >= now)
      .slice(0, 4);
  }, [events]);

  const quickLinks = [
    { icon: BookOpen, label: NAV_LABELS["/resources"], path: "/resources" },
    { icon: CalendarDays, label: NAV_LABELS["/agenda"], path: "/agenda" },
    { icon: Users, label: NAV_LABELS["/union"], path: "/union" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <section className="glass rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Ton profil</p>
        <button
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
            {(profile?.display_name || "ET").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{profile?.display_name || "Étudiant"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {universityNames[profile?.university || ""] || profile?.university || "—"}
            </p>
          </div>
        </button>
      </section>

      <section className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">À venir</p>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground">Rien de prévu pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => navigate("/agenda")}
                  className="w-full text-left rounded-xl px-3 py-2 hover:bg-accent/40 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-[0.7rem] text-muted-foreground">
                    {new Date(e.start_time).toLocaleString("fr-BE", {
                      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  {e.location && (
                    <p className="text-[0.7rem] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {e.location}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Raccourcis</p>
        </div>
        <div className="flex flex-col gap-1">
          {quickLinks.map(({ icon: Icon, label, path }) => (
            <motion.button
              key={path}
              whileHover={{ x: 2 }}
              onClick={() => navigate(path)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
};

const RightRail = () => {
  const { content } = useDetailPanel();
  return (
    <aside className="hidden xl:block w-[20rem] shrink-0">
      <div className="sticky top-[4.5rem] max-h-[calc(100dvh-5.5rem)] overflow-y-auto scrollbar-hide pr-1">
        {content ?? <DefaultRail />}
      </div>
    </aside>
  );
};

export default RightRail;
