import { Home, BookOpen, MessageCircle, GraduationCap, Mail } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/shared/hooks/useUnreadMessages";
import { NAV_LABELS_SHORT } from "@/lib/navLabels";

const items = [
  { icon: Home, label: NAV_LABELS_SHORT["/"], path: "/" },
  { icon: BookOpen, label: NAV_LABELS_SHORT["/resources"], path: "/resources" },
  { icon: MessageCircle, label: NAV_LABELS_SHORT["/chat"], path: "/chat" },
  { icon: GraduationCap, label: NAV_LABELS_SHORT["/tutoring"], path: "/tutoring" },
  { icon: Mail, label: NAV_LABELS_SHORT["/messages"], path: "/messages", showUnread: true },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useUnreadMessages();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-safe">
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const active =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg min-w-[3.5rem] relative transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.showUnread && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[1rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[0.55rem] font-mono font-semibold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[0.65rem] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
