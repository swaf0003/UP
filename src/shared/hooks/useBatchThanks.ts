import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BatchThanksState {
  countsByMessage: Record<string, number>;
  givenByMe: Set<string>;
  starsLeftToday: number;
  markStarGiven: (messageId: string) => void;
}

/**
 * Batch-fetches all thanks counts & current user's daily star quota in 2 flat queries
 * instead of 3 queries per MerciButton (eliminates the 150+ N+1 HTTP storm).
 */
export function useBatchThanks(userId: string | undefined, messageIds: string[]): BatchThanksState {
  const [countsByMessage, setCountsByMessage] = useState<Record<string, number>>({});
  const [givenByMe, setGivenByMe] = useState<Set<string>>(new Set());
  const [starsLeftToday, setStarsLeftToday] = useState<number>(3);

  const idsKey = useMemo(() => messageIds.join(","), [messageIds]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const load = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [todayRes, msgsRes] = await Promise.all([
        supabase
          .from("thanks")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", userId)
          .eq("given_date", today),
        messageIds.length > 0
          ? supabase
              .from("thanks")
              .select("message_id, sender_id")
              .in("message_id", messageIds)
          : Promise.resolve({ data: [] as { message_id: string; sender_id: string }[] }),
      ]);

      if (cancelled) return;

      setStarsLeftToday(Math.max(0, 3 - (todayRes.count ?? 0)));

      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      for (const row of msgsRes.data ?? []) {
        if (!row.message_id) continue;
        counts[row.message_id] = (counts[row.message_id] ?? 0) + 1;
        if (row.sender_id === userId) mine.add(row.message_id);
      }
      setCountsByMessage(counts);
      setGivenByMe(mine);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, idsKey]);

  const markStarGiven = useCallback((messageId: string) => {
    setGivenByMe((prev) => new Set(prev).add(messageId));
    setCountsByMessage((prev) => ({ ...prev, [messageId]: (prev[messageId] ?? 0) + 1 }));
    setStarsLeftToday((prev) => Math.max(0, prev - 1));
  }, []);

  return { countsByMessage, givenByMe, starsLeftToday, markStarGiven };
}
