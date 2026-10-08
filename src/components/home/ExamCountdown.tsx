import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, CalendarDays, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const STORAGE_KEY = "exam-countdown-date";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const ExamCountdown = () => {
  const [examDate, setExamDate] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [editing, setEditing] = useState(false);
  const [inputDate, setInputDate] = useState("");
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!examDate) return;
    const calc = () => {
      const diff = new Date(examDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [examDate]);

  const saveDate = () => {
    if (!inputDate) return;
    localStorage.setItem(STORAGE_KEY, inputDate);
    setExamDate(inputDate);
    setEditing(false);
  };

  const clearDate = () => {
    localStorage.removeItem(STORAGE_KEY);
    setExamDate(null);
    setTimeLeft(null);
  };

  const progress = examDate && timeLeft
    ? Math.max(0, Math.min(100, 100 - (timeLeft.days / 90) * 100))
    : 0;

  if (!examDate && !editing) {
    return (
      <motion.section variants={fadeUp}>
        <motion.button
          onClick={() => setEditing(true)}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="w-full glass rounded-2xl p-4 text-left group transition-shadow hover:shadow-lg hover:shadow-primary/10"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center">
              <Target className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-foreground">Dernière ligne droite</p>
              <p className="text-[0.65rem] text-muted-foreground">Configure la date de ton premier examen</p>
            </div>
          </div>
        </motion.button>
      </motion.section>
    );
  }

  if (editing) {
    return (
      <motion.section variants={fadeUp} className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-warning" />
          <span className="text-sm font-heading font-semibold text-foreground">Date du premier examen</span>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="rounded-xl flex-1"
            min={new Date().toISOString().split("T")[0]}
          />
          <Button size="icon" className="rounded-xl gradient-primary shrink-0" onClick={saveDate}>
            <Check className="w-4 h-4 text-primary-foreground" />
          </Button>
          <Button size="icon" variant="ghost" className="rounded-xl shrink-0" onClick={() => setEditing(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.section>
    );
  }

  if (!timeLeft) {
    return (
      <motion.section variants={fadeUp} className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎓</span>
            <p className="text-sm font-heading font-semibold text-foreground">Session terminée ! Bonne chance 💪</p>
          </div>
          <Button size="sm" variant="ghost" className="text-xs" onClick={clearDate}>Réinitialiser</Button>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section variants={fadeUp} className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-warning" />
          <span className="text-sm font-heading font-semibold text-foreground">Dernière ligne droite</span>
        </div>
        <button onClick={clearDate} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Countdown digits */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: timeLeft.days, label: "jours" },
          { value: timeLeft.hours, label: "heures" },
          { value: timeLeft.minutes, label: "min" },
          { value: timeLeft.seconds, label: "sec" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <motion.p
              key={item.value}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-xl font-heading font-bold text-foreground tabular-nums"
            >
              {String(item.value).padStart(2, "0")}
            </motion.p>
            <p className="text-[0.6rem] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--gradient-primary)" }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <p className="text-[0.6rem] text-muted-foreground text-right">
          {timeLeft.days > 30 ? "T'as le temps, mais commence déjà 😉" :
           timeLeft.days > 14 ? "On s'y met sérieusement ! 📚" :
           timeLeft.days > 7 ? "C'est maintenant ou jamais ! 🔥" :
           timeLeft.days > 1 ? "Derniers jours, tu gères ! 💪" :
           "C'est demain... COURAGE ! 🚀"}
        </p>
      </div>
    </motion.section>
  );
};

export default ExamCountdown;
