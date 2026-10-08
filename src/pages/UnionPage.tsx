import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Heart, MessageSquare, Search, X, UserMinus, Compass, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ContactProfile {
  contact_id: string;
  user_id: string;
  display_name: string;
  university: string;
  faculty: string;
  avatar_url: string | null;
}

const UnionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchContacts = async () => {
      // Get contact relationships
      const { data: contactRows } = await supabase
        .from("contacts")
        .select("id, contact_user_id")
        .eq("user_id", user.id);

      if (!contactRows || contactRows.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const contactUserIds = contactRows.map((c) => c.contact_user_id);

      // Fetch profiles for these users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, university, faculty, avatar_url")
        .in("user_id", contactUserIds);

      if (profiles) {
        const mapped: ContactProfile[] = profiles.map((p) => {
          const row = contactRows.find((c) => c.contact_user_id === p.user_id);
          return {
            contact_id: row?.id || "",
            user_id: p.user_id,
            display_name: p.display_name,
            university: p.university,
            faculty: p.faculty,
            avatar_url: p.avatar_url,
          };
        });
        setContacts(mapped);
      }
      setLoading(false);
    };
    fetchContacts();
  }, [user]);

  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.display_name.toLowerCase().includes(q) || c.university.toLowerCase().includes(q);
  });

  const handleRemove = async (contactId: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", contactId);
    if (!error) {
      setContacts((prev) => prev.filter((c) => c.contact_id !== contactId));
      toast.success("Contact retiré");
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const getAvatarUrl = (url: string | null) => {
    if (!url || url === "") return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${url}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground mb-1">Mon Union</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? "Chargement..." : `${contacts.length} contact(s)`}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher un contact..." className="pl-10 rounded-xl glass border-border" />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Contacts List */}
      <section className="space-y-2">
        <AnimatePresence>
          {filteredContacts.map((contact) => {
            const avatarUrl = getAvatarUrl(contact.avatar_url);
            return (
              <motion.div
                key={contact.contact_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center gradient-primary text-primary-foreground text-sm font-bold shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={contact.display_name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(contact.display_name || "?")
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{contact.display_name || "Sans nom"}</p>
                    <Badge variant="outline" className="text-[0.55rem] px-1.5 py-0 shrink-0">
                      {contact.university} · {contact.faculty}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl shrink-0"
                    onClick={() => navigate(`/messages/${contact.user_id}`)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(contact.contact_id)}
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!loading && filteredContacts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
          >
            {contacts.length === 0 ? (
              <>
                <div className="w-20 h-20 rounded-3xl gradient-accent flex items-center justify-center mb-5">
                  <Heart className="w-8 h-8 text-accent-foreground" />
                </div>
                <h3 className="font-heading font-bold text-foreground text-lg mb-2">Ton Union est vide</h3>
                <p className="text-sm text-muted-foreground max-w-[260px] mb-5">
                  Ajoute des étudiants à ton réseau pour discuter et collaborer ensemble !
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => navigate("/explore")} className="rounded-xl gradient-primary text-primary-foreground gap-1.5">
                    <Compass className="w-4 h-4" /> Explorer
                  </Button>
                  <Button onClick={() => navigate("/chat")} variant="outline" className="rounded-xl gap-1.5">
                    <Sparkles className="w-4 h-4" /> Rejoindre un Hub
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun contact trouvé pour "{searchQuery}"</p>
            )}
          </motion.div>
        )}
      </section>
    </motion.div>
  );
};

export default UnionPage;
