import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface StarButtonProps {
  messageId: string;
  senderId: string;
  source: 'private' | 'hub';
  className?: string;
}

export default function MerciButton({ messageId, senderId, source, className }: StarButtonProps) {
  const { user } = useAuthContext();
  const [starred, setStarred] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [starsLeftToday, setStarsLeftToday] = useState(3);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const [{ data: mine }, { count: total }, { count: givenToday }] = await Promise.all([
        supabase.from('thanks').select('id').eq('message_id', messageId).eq('sender_id', user.id).maybeSingle(),
        supabase.from('thanks').select('*', { count: 'exact', head: true }).eq('message_id', messageId),
        supabase.from('thanks').select('*', { count: 'exact', head: true })
          .eq('sender_id', user.id)
          .eq('given_date', new Date().toISOString().split('T')[0]),
      ]);
      setStarred(!!mine);
      setCount(total || 0);
      setStarsLeftToday(3 - (givenToday || 0));
    };
    check();
  }, [user, messageId]);

  const toggle = async () => {
    if (!user || user.id === senderId || loading) return;
    setLoading(true);

    if (starred) {
      await supabase.from('thanks').delete().eq('message_id', messageId).eq('sender_id', user.id);
      setStarred(false);
      setCount((c) => Math.max(c - 1, 0));
      setStarsLeftToday((s) => Math.min(s + 1, 3));
    } else {
      if (starsLeftToday <= 0) {
        toast.error('Tu as utilisé tes 3 étoiles du jour ! Reviens demain ⭐');
        setLoading(false);
        return;
      }
      const { error } = await supabase.from('thanks').insert({
        message_id: messageId,
        message_source: source,
        sender_id: user.id,
        receiver_id: senderId,
        given_date: new Date().toISOString().split('T')[0],
      });
      if (!error) {
        setStarred(true);
        setCount((c) => c + 1);
        setStarsLeftToday((s) => s - 1);
        toast.success(`Étoile envoyée ! ⭐ (${starsLeftToday - 1} restante${starsLeftToday - 1 !== 1 ? 's' : ''} aujourd'hui)`);
      } else if (error.code === '23505') {
        toast.info('Déjà récompensé !');
      } else {
        toast.error("Impossible d'envoyer l'étoile");
      }
    }
    setLoading(false);
  };

  if (!user || user.id === senderId) return null;

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={toggle}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-medium transition-all',
        starred
          ? 'text-yellow-500 bg-yellow-500/10'
          : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/5',
        className
      )}
    >
      <AnimatePresence mode="wait">
        {starred ? (
          <motion.div key="starred" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400 }}>
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
          </motion.div>
        ) : (
          <motion.div key="unstarred" whileHover={{ scale: 1.2, rotate: 15 }}>
            <Star className="w-3.5 h-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
      {count > 0 && <span>{count}</span>}
      {!starred && count === 0 && <span>Étoile</span>}
    </motion.button>
  );
}
