import { supabase } from '@/integrations/supabase/client';

// ── Ranks ──
export const RANKS = [
  { name: 'Nouveau', min: 0, max: 10, icon: '🌱' },
  { name: 'Membre', min: 10, max: 30, icon: '📘' },
  { name: 'Contributeur', min: 30, max: 75, icon: '🤝' },
  { name: 'Pilier', min: 75, max: 150, icon: '💪' },
  { name: 'Guide', min: 150, max: 300, icon: '🧭' },
  { name: 'Sage', min: 300, max: Infinity, icon: '🌟' },
];

export function getRank(score: number) {
  const idx = RANKS.findIndex((r) => score < r.max);
  const rank = RANKS[idx >= 0 ? idx : RANKS.length - 1];
  const rankNum = (idx >= 0 ? idx : RANKS.length - 1) + 1;
  const progress = rank.max === Infinity ? 100 : Math.round(((score - rank.min) / (rank.max - rank.min)) * 100);
  const nextRank = idx >= 0 && idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  return { rank, rankNum, progress, nextRank, remaining: rank.max === Infinity ? 0 : rank.max - score };
}

// ── Score calculation ──
// Union Score = (stars received × 1) + (times added to someone's Union × 2)
export async function fetchUnionScore(userId: string): Promise<{ score: number; starsReceived: number; contactAdds: number }> {
  const [{ count: stars }, { count: contactAdds }] = await Promise.all([
    supabase.from('thanks').select('*', { count: 'exact', head: true }).eq('receiver_id', userId),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('contact_user_id', userId),
  ]);

  const starsReceived = stars || 0;
  const adds = contactAdds || 0;
  const score = starsReceived + adds * 2;

  return { score, starsReceived, contactAdds: adds };
}

// ── Leaderboard ──
export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  university: string;
  faculty: string;
  score: number;
  rank: ReturnType<typeof getRank>['rank'];
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  // Get star counts per receiver
  const { data: thanks } = await supabase.from('thanks').select('receiver_id');
  // Get contact-add counts per contact_user_id
  const { data: contacts } = await supabase.from('contacts').select('contact_user_id');

  const scoreMap: Record<string, number> = {};

  for (const t of thanks || []) {
    scoreMap[t.receiver_id] = (scoreMap[t.receiver_id] || 0) + 1;
  }
  for (const c of contacts || []) {
    scoreMap[c.contact_user_id] = (scoreMap[c.contact_user_id] || 0) + 2;
  }

  const sorted = Object.entries(scoreMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);

  if (sorted.length === 0) return [];

  const userIds = sorted.map(([id]) => id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url, university, faculty')
    .in('user_id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

  return sorted.map(([userId, score]) => {
    const p = profileMap.get(userId);
    return {
      user_id: userId,
      display_name: p?.display_name || 'Anonyme',
      avatar_url: p?.avatar_url || null,
      university: p?.university || '',
      faculty: p?.faculty || '',
      score,
      rank: getRank(score).rank,
    };
  });
}

export async function fetchStarsGivenToday(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('thanks')
    .select('*', { count: 'exact', head: true })
    .eq('sender_id', userId)
    .eq('given_date', today);
  return count || 0;
}
