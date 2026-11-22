import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import { Star, MessageCircle, ArrowUp, Settings, LogOut, ChevronRight, Camera, Loader2, Crown, Shield, Medal, Award, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { validateAvatarFile } from '@/lib/urlValidation';
import { fetchUnionScore, fetchLeaderboard, getRank, RANKS, type LeaderboardEntry } from '@/hooks/useUnionScore';

const universityNames: Record<string, string> = {
  ulb: 'ULB', uclouvain: 'UCLouvain', uliege: 'ULiège', umons: 'UMons',
  unamur: 'UNamur', uantwerpen: 'UAntwerpen', ugent: 'UGent', uhasselt: 'UHasselt', vub: 'VUB',
};

const BADGES = [
  { id: 'first_star', name: 'Première Étoile', icon: '⭐', desc: 'Recevoir ta première étoile', threshold: 1 },
  { id: 'connected', name: 'Connecté', icon: '🔗', desc: '10 de Union Score', threshold: 10 },
  { id: 'pilier', name: 'Pilier', icon: '💪', desc: '75 de Union Score', threshold: 75 },
  { id: 'guide', name: 'Guide', icon: '🧭', desc: '150 de Union Score', threshold: 150 },
  { id: 'sage', name: 'Sage', icon: '🌟', desc: '300 de Union Score', threshold: 300 },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuthContext();
  const { isAdmin, isOwner } = useAdmin();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ messagesSent: 0, messagesReceived: 0 });
  const [unionScore, setUnionScore] = useState(0);
  const [starsReceived, setStarsReceived] = useState(0);
  const [contactAdds, setContactAdds] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ count: sent }, { count: received }] = await Promise.all([
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender_id', user.id),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id),
      ]);
      setStats({ messagesSent: sent || 0, messagesReceived: received || 0 });

      const scoreData = await fetchUnionScore(user.id);
      setUnionScore(scoreData.score);
      setStarsReceived(scoreData.starsReceived);
      setContactAdds(scoreData.contactAdds);

      const lb = await fetchLeaderboard(5);
      setLeaderboard(lb);
    };
    fetchData();
  }, [user]);

  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Étudiant';
  const university = universityNames[profile?.university || user?.user_metadata?.university || ''] || '';
  const faculty = profile?.faculty || user?.user_metadata?.faculty || '';
  const year = profile?.academic_year || user?.user_metadata?.academic_year || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  const avatarUrl = profile?.avatar_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
    : null;

  const { rank, rankNum, progress, remaining, nextRank } = getRank(unionScore);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast({ title: 'Fichier invalide', description: validation.error, variant: 'destructive' });
      return;
    }
    setUploading(true);
    const filePath = `${user.id}/avatar.${validation.ext}`;
    if (profile?.avatar_url) {
      await supabase.storage.from('avatars').remove([profile.avatar_url]);
    }
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });
    if (uploadError) {
      toast({ title: 'Erreur', description: "Impossible d'uploader la photo.", variant: 'destructive' });
      setUploading(false);
      return;
    }
    await supabase.from('profiles').update({ avatar_url: filePath }).eq('user_id', user.id);
    await refreshProfile();
    toast({ title: '✅ Photo mise à jour !' });
    setUploading(false);
  };

  return (
    <motion.div className="space-y-6" variants={stagger} initial="initial" animate="animate">
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />

      {/* Profile Card */}
      <motion.div variants={fadeUp} className="glass rounded-3xl p-6 text-center relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full gradient-primary opacity-10 blur-3xl animate-float" />
        <div className="absolute -left-8 -bottom-8 w-28 h-28 rounded-full bg-accent opacity-15 blur-2xl animate-float" style={{ animationDelay: "3s" }} />

        {/* Avatar */}
        <motion.div
          className="relative inline-block mb-3"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-24 h-24 rounded-full overflow-hidden cursor-pointer ring-4 ring-background shadow-xl transition-shadow hover:shadow-2xl hover:shadow-primary/20",
              !avatarUrl && "gradient-primary flex items-center justify-center"
            )}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-foreground font-heading font-bold text-2xl">{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background hover:scale-110 transition-transform"
          >
            {uploading ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" /> : <Camera className="w-4 h-4 text-primary-foreground" />}
          </button>
        </motion.div>

        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl font-heading font-bold text-foreground">{displayName}</h2>
          {isOwner && (
            <Badge className="gradient-primary border-0 text-[0.65rem] gap-1"><Crown className="w-3 h-3" /> Owner</Badge>
          )}
          {!isOwner && isAdmin && (
            <Badge variant="secondary" className="text-[0.65rem] gap-1"><Shield className="w-3 h-3" /> Admin</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {university}{faculty ? ` · ${faculty}` : ''}{year ? ` · ${year}` : ''}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>

        {/* Union Score */}
        <motion.div
          className="mt-5 flex items-center gap-4 justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <div className="glass rounded-2xl p-4 flex items-center gap-3 ring-1 ring-accent-foreground/10">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
              <Trophy className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-heading font-bold text-foreground">{unionScore}</p>
              <p className="text-xs text-muted-foreground">Union Score</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Rank Progress */}
      <motion.div variants={fadeUp} className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">{rank.icon} {rank.name}</span>
          <span className="text-xs text-muted-foreground">{unionScore} / {rank.max === Infinity ? '∞' : rank.max}</span>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-2.5" />
          <div
            className="absolute top-0 left-0 h-2.5 rounded-full gradient-primary opacity-80 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        {nextRank && (
          <p className="text-xs text-muted-foreground mt-2">{remaining} points pour atteindre {nextRank.icon} {nextRank.name}</p>
        )}
      </motion.div>

      {/* Badges */}
      <motion.div variants={fadeUp} className="glass rounded-2xl p-5">
        <h3 className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-2">
          <Medal className="w-4 h-4 text-accent-foreground" /> Badges
        </h3>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((badge, i) => {
            const unlocked = unionScore >= badge.threshold;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: unlocked ? 1 : 0.35, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.06, type: "spring" }}
                whileHover={unlocked ? { scale: 1.08, y: -2 } : {}}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all cursor-default',
                  unlocked
                    ? 'glass ring-1 ring-accent-foreground/20 shadow-sm'
                    : 'bg-muted/30 grayscale'
                )}
                title={badge.desc}
              >
                <span className="text-lg">{badge.icon}</span>
                <span className={cn('text-xs font-medium', unlocked ? 'text-foreground' : 'text-muted-foreground')}>{badge.name}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        {[
          { icon: Star, value: starsReceived, label: "Étoiles", color: "text-points-gold" },
          { icon: ArrowUp, value: stats.messagesSent, label: "Messages", color: "text-accent-foreground" },
          { icon: MessageCircle, value: contactAdds, label: "Unions", color: "text-accent-foreground" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.05, y: -3 }}
            className="glass rounded-2xl p-4 text-center transition-shadow hover:shadow-lg hover:shadow-primary/10"
          >
            <stat.icon className={cn("w-5 h-5 mx-auto mb-1", stat.color)} />
            <p className="text-xl font-heading font-bold text-foreground">{stat.value}</p>
            <p className="text-[0.65rem] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Menu */}
      <motion.div variants={fadeUp} className="glass rounded-2xl overflow-hidden">
        {isAdmin && (
          <motion.button
            whileHover={{ x: 4 }}
            onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-accent/50 transition-colors text-left border-b border-border"
          >
            <Shield className="w-5 h-5 text-accent-foreground" />
            <span className="text-sm font-medium text-foreground flex-1">Administration</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}
        <motion.button
          whileHover={{ x: 4 }}
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-accent/50 transition-colors text-left border-b border-border"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground flex-1">Paramètres</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.button>
        <motion.button
          whileHover={{ x: 4 }}
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-destructive/10 transition-colors text-left"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive flex-1">Se déconnecter</span>
          <ChevronRight className="w-4 h-4 text-destructive" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
