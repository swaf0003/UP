import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, BookOpen, MessageCircle, Users, Mail, Compass, CalendarDays, User, Settings } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_LABELS } from "@/lib/navLabels";

export const COMMAND_PALETTE_EVENT = "open-command-palette";

export const openCommandPalette = () =>
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));

const mainItems = [
  { icon: Home, label: NAV_LABELS["/"], path: "/", keywords: "home accueil" },
  { icon: BookOpen, label: NAV_LABELS["/resources"], path: "/resources", keywords: "archive resources cours notes" },
  { icon: MessageCircle, label: NAV_LABELS["/chat"], path: "/chat", keywords: "hub chat salons" },
  { icon: Users, label: NAV_LABELS["/union"], path: "/union", keywords: "union contacts amis" },
  { icon: Mail, label: NAV_LABELS["/messages"], path: "/messages", keywords: "messages dm privé" },
  { icon: Compass, label: NAV_LABELS["/explore"], path: "/explore", keywords: "explorer recherche découvrir" },
];

const secondaryItems = [
  { icon: CalendarDays, label: NAV_LABELS["/agenda"], path: "/agenda", keywords: "agenda calendrier cours" },
  { icon: User, label: NAV_LABELS["/profile"], path: "/profile", keywords: "profil compte" },
  { icon: Settings, label: NAV_LABELS["/settings"], path: "/settings", keywords: "paramètres réglages settings" },
];

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(COMMAND_PALETTE_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COMMAND_PALETTE_EVENT, onOpen);
    };
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Aller à… (Accueil, L'Archive, Le Hub…)" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {mainItems.map(({ icon: Icon, label, path, keywords }) => (
            <CommandItem key={path} value={`${label} ${keywords}`} onSelect={() => go(path)}>
              <Icon className="mr-2 h-4 w-4" />
              <span>{label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Autres">
          {secondaryItems.map(({ icon: Icon, label, path, keywords }) => (
            <CommandItem key={path} value={`${label} ${keywords}`} onSelect={() => go(path)}>
              <Icon className="mr-2 h-4 w-4" />
              <span>{label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
