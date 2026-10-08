import { Home, BookOpen, MessageCircle, Users, User, Compass, Mail, Shield, CalendarDays, Settings, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuthContext } from "@/contexts/AuthContext";
import { NAV_LABELS } from "@/lib/navLabels";

const navItems = [
  { icon: Home, label: NAV_LABELS["/"], path: "/", emoji: "🏠" },
  { icon: BookOpen, label: NAV_LABELS["/resources"], path: "/resources", emoji: "📚" },
  { icon: MessageCircle, label: NAV_LABELS["/chat"], path: "/chat", emoji: "💬" },
  { icon: Users, label: NAV_LABELS["/union"], path: "/union", emoji: "🤝" },
  { icon: Mail, label: NAV_LABELS["/messages"], path: "/messages", emoji: "✉️" },
  { icon: Compass, label: NAV_LABELS["/explore"], path: "/explore", emoji: "🧭" },
  { icon: CalendarDays, label: NAV_LABELS["/agenda"], path: "/agenda", emoji: "📅" },
];

const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { profile, signOut } = useAuthContext();
  const { theme, toggleTheme } = useTheme();

  const allItems = isAdmin
    ? [...navItems, { icon: Shield, label: "Admin", path: "/admin", emoji: "⚙️" }]
    : navItems;

  const displayName = profile?.display_name || "Étudiant";
  const initials = displayName.slice(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
    : null;

  const universityNames: Record<string, string> = {
    ulb: "ULB", uclouvain: "UCLouvain", uliege: "ULiège", umons: "UMons",
    unamur: "UNamur", uantwerpen: "UAntwerpen", ugent: "UGent", uhasselt: "UHasselt", vub: "VUB",
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-16 lg:w-60 glass-strong flex-col z-40 transition-all duration-300">
      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2 lg:p-3 overflow-y-auto scrollbar-hide">
        {allItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
          return (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              title={label}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "flex items-center gap-3 px-3 lg:px-3.5 py-2.5 rounded-xl transition-all duration-200 text-[0.8rem] font-medium justify-center lg:justify-start relative group",
                active
                  ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              )}
            >
              <Icon className={cn("w-[1.15rem] h-[1.15rem] shrink-0", active && "drop-shadow-sm")} />
              <span className="hidden lg:inline truncate">{label}</span>
              {active && (
                <motion.div
                  layoutId="sidebarIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-foreground/60 hidden lg:block"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* User section at bottom */}
      <div className="p-2 lg:p-3 border-t border-border/50">
        <motion.button
          onClick={() => navigate("/profile")}
          whileHover={{ backgroundColor: "hsl(var(--accent) / 0.4)" }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center gradient-primary text-primary-foreground text-[0.55rem] font-bold shrink-0 ring-2 ring-background">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="hidden lg:block text-left min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
            <p className="text-[0.6rem] text-muted-foreground truncate">
              {universityNames[profile?.university || ""] || profile?.university || ""}
            </p>
          </div>
        </motion.button>

        {/* Quick actions */}
        <div className="hidden lg:flex gap-1 mt-1.5">
          <motion.button
            onClick={() => navigate("/settings")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[0.65rem] text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
          >
            <Settings className="w-3 h-3" />
            <span>Réglages</span>
          </motion.button>
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            className="flex items-center justify-center px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          </motion.button>
          <motion.button
            onClick={() => signOut()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center px-2 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-3 h-3" />
          </motion.button>
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
