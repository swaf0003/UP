import { useState, useEffect } from "react";
import { Home, BookOpen, MessageCircle, Users, Mail } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { NAV_LABELS_SHORT } from "@/lib/navLabels";

const leftItems = [
  { icon: Home, label: NAV_LABELS_SHORT["/"], path: "/" },
  { icon: BookOpen, label: NAV_LABELS_SHORT["/resources"], path: "/resources" },
];

const rightItems = [
  { icon: MessageCircle, label: NAV_LABELS_SHORT["/chat"], path: "/chat" },
  { icon: Users, label: NAV_LABELS_SHORT["/union"], path: "/union" },
];

const centerItem = { icon: Mail, label: NAV_LABELS_SHORT["/messages"], path: "/messages" };

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const renderItem = (item: { icon: any; label: string; path: string }) => {
    const Icon = item.icon;
    const active = location.pathname === item.path;
    return (
      <motion.button
        key={item.path}
        onClick={() => navigate(item.path)}
        whileTap={{ scale: 0.85 }}
        className={cn(
          "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 min-w-[4rem] relative",
          active
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className={cn("w-6 h-6 transition-all duration-300", active && "scale-110")} />
        <span className="text-[0.7rem] font-medium">{item.label}</span>
        {active && (
          <motion.div
            layoutId="bottomNavIndicator"
            className="absolute -top-0.5 w-6 h-0.5 rounded-full bg-primary"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </motion.button>
    );
  };

  const centerActive = location.pathname === centerItem.path || location.pathname.startsWith("/messages/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-background/90 backdrop-blur-2xl border-t border-border/30 shadow-[0_-4px_24px_hsl(var(--foreground)/0.04)]">
        <div className="flex items-end justify-around px-3 pb-safe pt-2 relative">
          {leftItems.map(renderItem)}

          {/* Center DMs button - raised with glow */}
          <div className="flex flex-col items-center -mt-5">
            <motion.button
              onClick={() => navigate(centerItem.path)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.08 }}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border-4 border-background relative",
                centerActive
                  ? "gradient-primary text-primary-foreground scale-110"
                  : "bg-primary/90 text-primary-foreground"
              )}
              style={{
                boxShadow: centerActive
                  ? "0 0 20px hsl(var(--primary) / 0.5), 0 4px 12px hsl(var(--primary) / 0.3)"
                  : "0 4px 12px hsl(var(--primary) / 0.2)",
              }}
            >
              <Mail className="w-6 h-6" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] rounded-full bg-destructive text-destructive-foreground text-[0.6rem] font-bold flex items-center justify-center px-1 shadow-md"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </motion.span>
              )}
            </motion.button>
            <span className={cn(
              "text-[0.6rem] font-medium mt-0.5",
              centerActive ? "text-primary" : "text-muted-foreground"
            )}>DMs</span>
          </div>

          {rightItems.map(renderItem)}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
