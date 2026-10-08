import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AppAccent {
  id: string;
  name: string;
  // HSL values (without hsl() wrapper) for CSS variable injection
  primary: string;        // main hue
  primaryEnd: string;     // gradient end
  gradient: string;       // Tailwind gradient for chat bubbles
}

export const appAccents: AppAccent[] = [
  {
    id: "indigo",
    name: "Indigo",
    primary: "243 75% 59%",
    primaryEnd: "220 90% 56%",
    gradient: "bg-gradient-to-br from-[hsl(243,75%,59%)] to-[hsl(220,90%,56%)]",
  },
  {
    id: "emerald",
    name: "Émeraude",
    primary: "160 84% 39%",
    primaryEnd: "142 71% 45%",
    gradient: "bg-gradient-to-br from-[hsl(160,84%,39%)] to-[hsl(142,71%,45%)]",
  },
  {
    id: "rose",
    name: "Rose",
    primary: "340 82% 52%",
    primaryEnd: "350 80% 60%",
    gradient: "bg-gradient-to-br from-[hsl(340,82%,52%)] to-[hsl(350,80%,60%)]",
  },
  {
    id: "amber",
    name: "Ambre",
    primary: "38 92% 50%",
    primaryEnd: "25 95% 53%",
    gradient: "bg-gradient-to-br from-[hsl(38,92%,50%)] to-[hsl(25,95%,53%)]",
  },
  {
    id: "cyan",
    name: "Cyan",
    primary: "199 89% 48%",
    primaryEnd: "186 80% 42%",
    gradient: "bg-gradient-to-br from-[hsl(199,89%,48%)] to-[hsl(186,80%,42%)]",
  },
  {
    id: "violet",
    name: "Violet",
    primary: "270 70% 55%",
    primaryEnd: "290 65% 50%",
    gradient: "bg-gradient-to-br from-[hsl(270,70%,55%)] to-[hsl(290,65%,50%)]",
  },
  {
    id: "coral",
    name: "Corail",
    primary: "16 85% 60%",
    primaryEnd: "0 84% 60%",
    gradient: "bg-gradient-to-br from-[hsl(16,85%,60%)] to-[hsl(0,84%,60%)]",
  },
  {
    id: "sky",
    name: "Ciel",
    primary: "210 100% 56%",
    primaryEnd: "220 90% 56%",
    gradient: "bg-gradient-to-br from-[hsl(210,100%,56%)] to-[hsl(220,90%,56%)]",
  },
];

interface ChatThemeContextType {
  accent: AppAccent;
  setAccentId: (id: string) => void;
}

const ChatThemeContext = createContext<ChatThemeContextType | undefined>(undefined);

export const useChatTheme = () => {
  const ctx = useContext(ChatThemeContext);
  if (!ctx) throw new Error("useChatTheme must be used within ChatThemeProvider");
  return ctx;
};

export const ChatThemeProvider = ({ children }: { children: ReactNode }) => {
  const [accentId, setAccentIdState] = useState(() => {
    return localStorage.getItem("app-accent") || "indigo";
  });

  const accent = appAccents.find((a) => a.id === accentId) || appAccents[0];

  // Inject CSS variables globally so --primary, --ring, --gradient-primary all update
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", accent.primary);
    root.style.setProperty("--ring", accent.primary);
    root.style.setProperty("--accent-foreground", accent.primary);
    root.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${accent.primary}), hsl(${accent.primaryEnd}))`
    );
    root.style.setProperty(
      "--gradient-accent",
      `linear-gradient(135deg, hsl(${accent.primary} / 0.1), hsl(${accent.primaryEnd} / 0.1))`
    );
  }, [accent]);

  const setAccentId = (id: string) => {
    setAccentIdState(id);
    localStorage.setItem("app-accent", id);
  };

  return (
    <ChatThemeContext.Provider value={{ accent, setAccentId }}>
      {children}
    </ChatThemeContext.Provider>
  );
};

// Backward compat alias
export type ChatColor = AppAccent;
export const chatColors = appAccents;
