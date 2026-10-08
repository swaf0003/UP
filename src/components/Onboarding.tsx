import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, MessageCircle, Users, Compass, ChevronRight, ChevronLeft, Sparkles, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const steps = [
  {
    emoji: "🎓",
    title: "Bienvenue sur Union",
    description: "La plateforme communautaire pensée par et pour les étudiants belges. Prêt à découvrir ?",
    gradient: "from-primary to-info",
  },
  {
    emoji: "📚",
    icon: BookOpen,
    title: "The Archive",
    description: "Tous tes cours, vidéos, résumés et quiz au même endroit. Classés par université, faculté et année.",
    gradient: "from-destructive to-warning",
  },
  {
    emoji: "💬",
    icon: MessageCircle,
    title: "The Hub",
    description: "Des salons de discussion par cours avec assistant IA intégré. Pose tes questions, aide les autres.",
    gradient: "from-info to-primary",
  },
  {
    emoji: "🤝",
    icon: Users,
    title: "Ton Union",
    description: "Construis ton réseau étudiant. Ajoute des contacts, envoie des DMs, gagne des points.",
    gradient: "from-success to-info",
  },
  {
    emoji: "🚀",
    icon: Zap,
    title: "C'est parti !",
    description: "Explore, échange, apprends. Ensemble, on va plus loin.",
    gradient: "from-primary to-success",
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      localStorage.setItem("onboarding-done", "true");
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("onboarding-done", "true");
    onComplete();
  };

  const current = steps[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/98 backdrop-blur-xl p-6"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 -left-20 w-64 h-64 rounded-full gradient-primary opacity-[0.06] blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-1/4 -right-20 w-56 h-56 rounded-full bg-info opacity-[0.05] blur-3xl"
        />
      </div>

      <div className="max-w-sm w-full relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -80 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="text-center space-y-6"
          >
            {/* Visual */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 250, delay: 0.1 }}
              className="relative mx-auto"
            >
              {step === 0 ? (
                <div className="w-28 h-28 mx-auto relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-3xl border-2 border-dashed border-primary/20"
                  />
                  <div className="absolute inset-2 rounded-2xl overflow-hidden shadow-xl shadow-primary/20">
                    <img src={logo} alt="Union Project" className="w-full h-full object-contain" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center bg-gradient-to-br ${current.gradient} shadow-xl`}
                  >
                    <span className="text-5xl">{current.emoji}</span>
                  </motion.div>
                  {/* Floating particles */}
                  <motion.div
                    animate={{ y: [-5, 5, -5], x: [3, -3, 3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -top-2 -right-2 text-2xl"
                  >
                    ✨
                  </motion.div>
                </div>
              )}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-2xl font-heading font-bold text-foreground"
            >
              {current.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-muted-foreground text-sm leading-relaxed max-w-[280px] mx-auto"
            >
              {current.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-10">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 28 : 8,
                backgroundColor: i === step ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.25)",
              }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full"
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button variant="outline" onClick={handlePrev} className="rounded-xl px-4">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="flex-1 rounded-xl gradient-primary text-primary-foreground h-12 text-sm font-semibold gap-2 shadow-lg shadow-primary/20"
          >
            {step === steps.length - 1 ? (
              <>
                <Sparkles className="w-4 h-4" /> C'est parti !
              </>
            ) : (
              <>
                Suivant <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {step === 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleSkip}
            className="w-full text-center mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Passer le tutoriel
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
