import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "up-archive-favorites";

export function useFavorites(userId?: string) {
  const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setFavoriteIds(raw ? new Set<string>(JSON.parse(raw)) : new Set<string>());
    } catch {
      setFavoriteIds(new Set());
    }
  }, [key]);

  const toggleFavorite = useCallback(
    (resourceId: string) => {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(resourceId)) next.delete(resourceId);
        else next.add(resourceId);
        try {
          localStorage.setItem(key, JSON.stringify(Array.from(next)));
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
    },
    [key]
  );

  return { favoriteIds, toggleFavorite };
}
