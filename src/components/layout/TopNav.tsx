import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, X, Command } from "lucide-react";
import { openCommandPalette } from "@/components/CommandPalette";
import { Input } from "@/components/ui/input";
import { useAuthContext } from "@/contexts/AuthContext";
import { useUnreadMessages } from "@/shared/hooks/useUnreadMessages";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { getPageLabel } from "@/lib/navLabels";

const TopNav = () => {
  const { profile, user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useUnreadMessages();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const displayName = profile?.display_name || user?.user_metadata?.display_name || '';
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '?';
  const avatarUrl = profile?.avatar_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
    : null;

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  // Get page title
  const pageTitle = location.pathname === "/" ? null : getPageLabel(location.pathname);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="container flex items-center justify-between h-14">
        {/* Left: Logo / Title */}
        <motion.div
          className="flex items-center gap-2.5 cursor-pointer min-w-0"
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <img src={logo} alt="Union Project" className="w-8 h-8 rounded-lg object-contain shrink-0" />
          <AnimatePresence mode="wait">
            {pageTitle ? (
              <motion.span
                key={pageTitle}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="text-sm font-heading font-bold tracking-tight text-foreground truncate"
              >
                {pageTitle}
              </motion.span>
            ) : (
              <motion.span
                key="home"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="text-sm font-heading font-bold tracking-tight text-foreground"
              >
                Union Project
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Search */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                  placeholder="Rechercher..."
                  className="h-8 rounded-lg text-xs bg-card border-border/60"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Command palette */}
          <motion.button
            onClick={openCommandPalette}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Navigation rapide (⌘K)"
            className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border border-border/60"
          >
            <Command className="w-3.5 h-3.5" />
            <span className="text-[0.65rem] font-medium">K</span>
          </motion.button>
          <motion.button
            onClick={openCommandPalette}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Navigation rapide"
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <Command className="w-4 h-4" />
          </motion.button>

          <motion.button
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </motion.button>


          {/* Notifications */}
          <motion.button
            onClick={() => navigate('/messages')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 min-w-[0.9rem] h-[0.9rem] rounded-full bg-destructive text-destructive-foreground text-[0.5rem] font-bold flex items-center justify-center px-0.5"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </motion.button>

          {/* Avatar */}
          <motion.button
            onClick={() => navigate('/profile')}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center gradient-primary ring-2 ring-background shadow-sm ml-0.5"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[0.6rem] font-bold text-primary-foreground">{initials}</span>
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
