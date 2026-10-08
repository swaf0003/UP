import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Search, X, MessageSquare, Smile } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useChatTheme } from "@/contexts/ChatThemeContext";
import VoiceRecorder from "@/components/VoiceRecorder";
import VoiceMessageBubble from "@/components/chat/VoiceMessageBubble";
import DateSeparator from "@/components/chat/DateSeparator";
import ReadReceipt from "@/components/chat/ReadReceipt";
import MerciButton from "@/components/MerciButton";
import DeleteMessageDialog from "@/components/chat/DeleteMessageDialog";
import { toast } from "sonner";

interface ConversationSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  university: string;
  faculty: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  message_type: string;
  voice_url: string | null;
  voice_duration: number | null;
}

const MessagesPage = () => {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { accent } = useChatTheme();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactProfile, setContactProfile] = useState<{ display_name: string; avatar_url: string | null; university: string; faculty: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleLongPressStart = useCallback((msgId: string, isMine: boolean) => {
    if (!isMine) return;
    longPressTimer.current = setTimeout(() => setDeleteTarget(msgId), 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleDeleteMessage = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("messages").delete().eq("id", deleteTarget);
    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== deleteTarget));
      toast.success("Message supprimé");
    } else {
      toast.error("Erreur lors de la suppression");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!user || contactId) return;
    const fetchConversations = async () => {
      const { data: allMessages } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!allMessages || allMessages.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convMap = new Map<string, { msgs: Message[] }>();
      for (const msg of allMessages) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(partnerId)) convMap.set(partnerId, { msgs: [] });
        convMap.get(partnerId)!.msgs.push(msg as Message);
      }

      const partnerIds = [...convMap.keys()];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, university, faculty")
        .in("user_id", partnerIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const convList: ConversationSummary[] = partnerIds.map((pid) => {
        const { msgs } = convMap.get(pid)!;
        const profile = profileMap.get(pid);
        const lastMsg = msgs[0];
        const unread = msgs.filter((m) => m.receiver_id === user.id && !m.read).length;
        return {
          userId: pid,
          displayName: profile?.display_name || "Sans nom",
          avatarUrl: profile?.avatar_url || null,
          university: profile?.university || "",
          faculty: profile?.faculty || "",
          lastMessage: lastMsg.message_type === "voice" ? "🎤 Message vocal" : lastMsg.content,
          lastTime: formatTime(lastMsg.created_at),
          unread,
        };
      });

      convList.sort((a, b) => b.unread - a.unread);
      setConversations(convList);
      setLoading(false);
    };
    fetchConversations();
  }, [user, contactId]);

  useEffect(() => {
    if (!user || !contactId) return;
    const fetchMessages = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, university, faculty")
        .eq("user_id", contactId)
        .single();
      setContactProfile(profile);

      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      setMessages((data as Message[]) || []);
      setLoading(false);

      if (data && data.length > 0) {
        const unreadIds = data
          .filter((m: any) => m.receiver_id === user.id && !m.read)
          .map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await supabase.from("messages").update({ read: true }).in("id", unreadIds);
        }
      }
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages-${contactId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === contactId) ||
            (newMsg.sender_id === contactId && newMsg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, newMsg]);
            if (newMsg.receiver_id === user.id) {
              supabase.from("messages").update({ read: true }).eq("id", newMsg.id).then(() => {});
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, contactId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !user || !contactId) return;
    const content = message.trim();
    setMessage("");
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: contactId,
      content,
      message_type: "text",
    });
  };

  const handleVoiceSend = async (blob: Blob, duration: number) => {
    if (!user || !contactId) return;
    const fileName = `${user.id}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("voice-messages")
      .upload(fileName, blob, { contentType: "audio/webm" });
    if (uploadError) return;
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: contactId,
      content: "🎤 Message vocal",
      message_type: "voice",
      voice_url: fileName,
      voice_duration: Math.round(duration),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const getAvatarUrl = (url: string | null) => {
    if (!url || url === "") return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${url}`;
  };

  const filtered = conversations.filter((c) => {
    if (!searchQuery) return true;
    return c.displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Helper: should we show date separator between two messages?
  const shouldShowDate = (prev: Message | null, curr: Message) => {
    if (!prev) return true;
    const d1 = new Date(prev.created_at).toDateString();
    const d2 = new Date(curr.created_at).toDateString();
    return d1 !== d2;
  };

  // Is consecutive message from same sender (for grouping)
  const isConsecutive = (prev: Message | null, curr: Message) => {
    if (!prev) return false;
    if (prev.sender_id !== curr.sender_id) return false;
    const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff < 60000; // within 1 minute
  };

  // ── Conversation List ──
  if (!contactId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        <div className="px-1">
          <h1 className="text-2xl font-heading font-bold text-foreground">Messages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Chargement..." : `${conversations.length} conversation${conversations.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-10 h-11 rounded-2xl bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-0.5">
          <AnimatePresence>
            {filtered.map((c, i) => {
              const avatarUrl = getAvatarUrl(c.avatarUrl);
              return (
                <motion.button
                  key={c.userId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/messages/${c.userId}`)}
                  className={cn(
                    "w-full rounded-2xl p-3.5 flex items-center gap-3 transition-all text-left",
                    "hover:bg-accent/40 active:scale-[0.99]",
                    c.unread > 0 && "bg-accent/20"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-13 h-13 rounded-full overflow-hidden flex items-center justify-center bg-muted text-muted-foreground text-sm font-semibold"
                      style={{ width: 52, height: 52 }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={c.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                          {getInitials(c.displayName)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={cn(
                        "text-[0.9rem] truncate",
                        c.unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"
                      )}>
                        {c.displayName}
                      </p>
                      <span className={cn(
                        "text-[0.65rem] shrink-0 ml-2",
                        c.unread > 0 ? "text-primary font-semibold" : "text-muted-foreground"
                      )}>
                        {c.lastTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-[0.8rem] truncate",
                        c.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>
                        {c.lastMessage}
                      </p>
                      {c.unread > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 rounded-full gradient-primary flex items-center justify-center text-[0.6rem] font-bold text-primary-foreground px-1.5">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>

          {!loading && conversations.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <MessageSquare className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Aucune conversation</p>
                <p className="text-xs text-muted-foreground mt-1">Ajoute des contacts via l'Union pour commencer</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/union")} className="rounded-xl">
                Voir mes contacts
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Active Conversation ──
  const avatarUrl = getAvatarUrl(contactProfile?.avatar_url || null);
  const displayName = contactProfile?.display_name || "...";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="rounded-2xl p-3 mb-2 flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border/50">
        <button onClick={() => navigate("/messages")} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {getInitials(displayName)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
          <p className="text-[0.65rem] text-muted-foreground truncate">
            {contactProfile?.university} · {contactProfile?.faculty}
          </p>
        </div>
      </div>

      <DeleteMessageDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteMessage}
        deleting={deleting}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {messages.length === 0 && !loading && (
          <div className="text-center py-12">
            <Smile className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Envoie le premier message ! 👋</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null;
          const isMine = msg.sender_id === user?.id;
          const showDate = shouldShowDate(prev, msg);
          const consecutive = !showDate && isConsecutive(prev, msg);

          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={msg.created_at} />}
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "flex",
                  isMine ? "justify-end" : "justify-start",
                  consecutive ? "mt-0.5" : "mt-2.5"
                )}
                onTouchStart={() => handleLongPressStart(msg.id, isMine)}
                onTouchEnd={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(msg.id, isMine)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onContextMenu={(e) => { if (isMine) { e.preventDefault(); setDeleteTarget(msg.id); } }}
              >
                <div className={cn("flex flex-col gap-0.5 max-w-[80%]", isMine ? "items-end" : "items-start")}>
                  <div className={cn(
                    "px-3.5 py-2 w-fit",
                    isMine
                      ? cn(
                          accent.gradient, "text-white",
                          consecutive ? "rounded-2xl rounded-tr-lg" : "rounded-2xl rounded-br-md"
                        )
                      : cn(
                          "bg-card border border-border/60",
                          consecutive ? "rounded-2xl rounded-tl-lg" : "rounded-2xl rounded-bl-md"
                        )
                  )}>
                    {msg.message_type === "voice" && msg.voice_url ? (
                      <VoiceMessageBubble
                        voiceUrl={msg.voice_url}
                        duration={msg.voice_duration || 0}
                        isMine={isMine}
                      />
                    ) : (
                      <p className="text-[0.85rem] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <div className={cn(
                      "flex items-center gap-1 mt-1",
                      isMine ? "justify-end" : "justify-start"
                    )}>
                      <span className={cn(
                        "text-[0.58rem]",
                        isMine ? "text-white/60" : "text-muted-foreground"
                      )}>
                        {formatTime(msg.created_at)}
                      </span>
                      <ReadReceipt read={msg.read} isMine={isMine} />
                    </div>
                  </div>
                  {!isMine && !consecutive && (
                    <div className="ml-1">
                      <MerciButton messageId={msg.id} senderId={msg.sender_id} source="private" />
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="flex items-end gap-2 p-2">
        <div className="flex-1 flex items-center gap-1.5 bg-card border border-border/60 rounded-2xl px-3 py-1.5">
          <VoiceRecorder compact onSend={handleVoiceSend} />
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="border-none bg-transparent shadow-none focus-visible:ring-0 h-9 text-[0.85rem] px-1"
          />
        </div>
        <AnimatePresence>
          {message.trim() && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Button
                size="icon"
                className="w-10 h-10 rounded-full gradient-primary shrink-0 shadow-lg shadow-primary/20"
                onClick={handleSend}
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);

  if (hours < 24) {
    return date.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
  }
  if (hours < 48) return "Hier";
  return date.toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
}

export default MessagesPage;
