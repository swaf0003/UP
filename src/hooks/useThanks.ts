import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export async function fetchUserStarsReceived(userId: string): Promise<number> {
  const { count } = await supabase
    .from('thanks')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId);
  return count || 0;
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

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  university: string;
  faculty: string;
  stars_count: number;
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const { data: thanks } = await supabase
    .from('thanks')
    .select('receiver_id');

  if (!thanks || thanks.length === 0) return [];

  const countMap: Record<string, number> = {};
  for (const t of thanks) {
    countMap[t.receiver_id] = (countMap[t.receiver_id] || 0) + 1;
  }

  const sorted = Object.entries(countMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);

  const userIds = sorted.map(([id]) => id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url, university, faculty')
    .in('user_id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

  return sorted.map(([userId, count]) => {
    const p = profileMap.get(userId);
    return {
      user_id: userId,
      display_name: p?.display_name || 'Anonyme',
      avatar_url: p?.avatar_url || null,
      university: p?.university || '',
      faculty: p?.faculty || '',
      stars_count: count,
    };
  });
}
