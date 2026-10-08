import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AiAssistantProps {
  courseId: string;
  courseName: string;
}

export default function AiAssistant({ courseId, courseName }: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");

    try {
      const { data, error } = await supabase.functions.invoke("hub-ai-suggest", {
        body: { question: question.trim(), courseId },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        setAnswer(data.answer);
      }
    } catch (err: any) {
      toast.error("Erreur lors de la requête IA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating AI button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="absolute right-3 bottom-20 w-11 h-11 rounded-full gradient-primary shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground z-10"
          >
            <Sparkles className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* AI Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute right-2 bottom-20 w-[calc(100%-1rem)] max-w-sm glass rounded-2xl p-4 shadow-2xl z-20 border border-primary/10"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-heading font-semibold text-foreground">Assistant IA</p>
                  <p className="text-[0.6rem] text-muted-foreground">{courseName}</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="w-7 h-7 rounded-lg" onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Answer area */}
            {answer && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-3 rounded-xl bg-accent/50 text-sm text-foreground leading-relaxed max-h-48 overflow-y-auto"
              >
                {answer}
              </motion.div>
            )}

            {loading && (
              <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs">Réflexion en cours...</span>
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
                placeholder="Pose ta question..."
                className="rounded-xl text-sm h-9 bg-card border-border/60"
                disabled={loading}
              />
              <Button
                size="icon"
                className="w-9 h-9 rounded-xl gradient-primary shrink-0"
                onClick={handleAsk}
                disabled={loading || !question.trim()}
              >
                <Send className="w-3.5 h-3.5 text-primary-foreground" />
              </Button>
            </div>

            <p className="text-[0.55rem] text-muted-foreground/60 mt-2 text-center">
              L'IA peut faire des erreurs · Basé sur les ressources de l'Archive
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
