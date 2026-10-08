import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  check: (ctx: QuestContext) => Promise<boolean>;
}

interface QuestContext {
  userId: string;
  today: string;
}

// Define daily quests
const DAILY_QUESTS: Quest[] = [
  {
    id: 'send_message',
    title: 'Envoie un message',
    description: 'Envoie un message dans un salon ou en privé',
    icon: '💬',
    points: 5,
    check: async ({ userId, today }) => {
      const { count } = await supabase
        .from('hub_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .gte('created_at', today);
      const { count: count2 } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .gte('created_at', today);
      return ((count || 0) + (count2 || 0)) > 0;
    },
  },
  {
    id: 'give_star',
    title: 'Donne une étoile',
    description: "Récompense quelqu'un qui t'a aidé",
    icon: '⭐',
    points: 5,
    check: async ({ userId, today }) => {
      const { count } = await supabase
        .from('thanks')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .eq('given_date', today.split('T')[0]);
      return (count || 0) > 0;
    },
  },
  {
    id: 'hub_3_messages',
    title: '3 messages dans un salon',
    description: 'Participe activement à un salon de cours',
    icon: '🔥',
    points: 10,
    check: async ({ userId, today }) => {
      const { count } = await supabase
        .from('hub_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .gte('created_at', today);
      return (count || 0) >= 3;
    },
  },
];

export interface QuestStatus {
  quest: Quest;
  completed: boolean;
}

export function useQuests() {
  const { user } = useAuthContext();
  const [quests, setQuests] = useState<QuestStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!user) return;

    const checkQuests = async () => {
      const today = new Date().toISOString().split('T')[0];
      const todayStart = `${today}T00:00:00.000Z`;

      // Check which quests were already completed today
      const { data: completions } = await supabase
        .from('quest_completions')
        .select('quest_id')
        .eq('user_id', user.id)
        .eq('completed_date', today);

      const completedIds = new Set(completions?.map((c) => c.quest_id) || []);

      // Check each quest
      const ctx: QuestContext = { userId: user.id, today: todayStart };
      const results: QuestStatus[] = [];

      for (const quest of DAILY_QUESTS) {
        if (completedIds.has(quest.id)) {
          results.push({ quest, completed: true });
          continue;
        }

        const done = await quest.check(ctx);
        if (done) {
          // Auto-complete and award points
          await supabase.from('quest_completions').insert({
            user_id: user.id,
            quest_id: quest.id,
            completed_date: today,
            points_earned: quest.points,
          });
          results.push({ quest, completed: true });
        } else {
          results.push({ quest, completed: false });
        }
      }

      setQuests(results);

      // Get total quest points
      const { data: allCompletions } = await supabase
        .from('quest_completions')
        .select('points_earned')
        .eq('user_id', user.id);

      const total = allCompletions?.reduce((s, c) => s + (c.points_earned || 0), 0) || 0;
      setTotalPoints(total);
      setLoading(false);
    };

    checkQuests();
  }, [user]);

  return { quests, loading, totalPoints };
}
