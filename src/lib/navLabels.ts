// Source unique de vérité pour les libellés de navigation (FR)
export const NAV_LABELS: Record<string, string> = {
  "/": "Accueil",
  "/resources": "L'Archive",
  "/chat": "Le Hub",
  "/union": "Mon Union",
  "/messages": "Messages",
  "/explore": "Explorer",
  "/agenda": "Agenda",
  "/profile": "Profil",
  "/settings": "Paramètres",
  "/admin": "Admin",
};

// Versions courtes pour la barre de navigation mobile
export const NAV_LABELS_SHORT: Record<string, string> = {
  "/": "Accueil",
  "/resources": "Archive",
  "/chat": "Hub",
  "/union": "Union",
  "/messages": "Messages",
};

export const getPageLabel = (pathname: string): string | null => {
  if (NAV_LABELS[pathname]) return NAV_LABELS[pathname];
  const match = Object.keys(NAV_LABELS)
    .filter((p) => p !== "/" && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? NAV_LABELS[match] : null;
};
