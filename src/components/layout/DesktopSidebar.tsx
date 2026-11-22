import {
  Home, BookOpen, MessageCircle, Users, Mail, CalendarDays, Compass,
  GraduationCap, Settings, Moon, Sun, LogOut, Shield,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUnreadMessages } from "@/shared/hooks/useUnreadMessages";
import { NAV_LABELS } from "@/lib/navLabels";
import { getUniversityShortName } from "@/shared/constants/universities";

const navItems = [
  { icon: Home, label: NAV_LABELS["/"], path: "/" },
  { icon: BookOpen, label: NAV_LABELS["/resources"], path: "/resources" },
  { icon: MessageCircle, label: NAV_LABELS["/chat"], path: "/chat" },
  { icon: GraduationCap, label: NAV_LABELS["/tutoring"], path: "/tutoring" },
  { icon: Mail, label: NAV_LABELS["/messages"], path: "/messages", showUnread: true },
  { icon: CalendarDays, label: NAV_LABELS["/agenda"], path: "/agenda" },
  { icon: Compass, label: NAV_LABELS["/explore"], path: "/explore" },
  { icon: Users, label: NAV_LABELS["/union"], path: "/union" },
];

const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAdmin();
  const unreadCount = useUnreadMessages();

  const displayName = profile?.display_name || user?.user_metadata?.display_name || "Étudiant";
  const initials = displayName.slice(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
    : null;

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-14 bottom-0 w-16 lg:w-60 z-40 border-r border-border bg-card">
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                active
                  ? "bg-primary/12 text-foreground border border-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
              )}
              title={item.label}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", active && "text-primary")} />
              <span className="hidden lg:inline truncate flex-1 text-left">{item.label}</span>
              {item.showUnread && unreadCount > 0 && (
                <span className="hidden lg:inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[0.65rem] font-mono font-semibold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
              location.pathname.startsWith("/admin")
                ? "bg-primary/12 text-foreground border-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border-transparent"
            )}
            title="Administration"
          >
            <Shield className="w-4 h-4 shrink-0 text-primary" />
            <span className="hidden lg:inline truncate">Administration</span>
          </button>
        )}
      </nav>

      {/* Bottom User Rail */}
      <div className="p-2.5 border-t border-border space-y-1.5">
        <button
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/60 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-mono font-semibold text-primary">{initials}</span>
            )}
          </div>
          <div className="hidden lg:block min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
            <p className="text-[0.65rem] font-mono text-muted-foreground truncate">
              {getUniversityShortName(profile?.university)} · {profile?.academic_year || "Étudiant"}
            </p>
          </div>
        </button>

        <div className="flex items-center justify-center lg:justify-between gap-1 px-1">
          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => signOut()}
            className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
