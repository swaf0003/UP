export const NAV_LABELS: Record<string, string> = {
  "/": "Accueil",
  "/resources": "L'Archive",
  "/chat": "Le Hub",
  "/tutoring": "Tutorat",
  "/messages": "Messages",
  "/union": "Mon Union",
  "/agenda": "Agenda",
  "/explore": "Explorer",
  "/profile": "Profil",
  "/settings": "Paramètres",
  "/admin": "Administration",
};

export const NAV_LABELS_SHORT: Record<string, string> = {
  "/": "Accueil",
  "/resources": "Archive",
  "/chat": "Hub",
  "/tutoring": "Tutorat",
  "/messages": "DMs",
  "/union": "Union",
};

export function getPageLabel(pathname: string): string {
  if (pathname.startsWith("/messages")) return NAV_LABELS["/messages"];
  if (pathname.startsWith("/user/")) return "Profil étudiant";
  if (pathname.startsWith("/tutoring")) return NAV_LABELS["/tutoring"];
  return NAV_LABELS[pathname] || "Union Project";
}
