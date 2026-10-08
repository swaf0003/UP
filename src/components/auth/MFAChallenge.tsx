import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Shield, Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';

interface MFAChallengeProps {
  onVerified: () => void;
  onCancel: () => void;
}

export default function MFAChallenge({ onVerified, onCancel }: MFAChallengeProps) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f: any) => f.status === 'verified');
      if (verified) {
        setFactorId(verified.id);
      }
    })();
  }, []);

  const handleVerify = async () => {
    if (!factorId || code.length !== 6) return;
    setVerifying(true);

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      toast({ title: 'Erreur', description: challengeError.message, variant: 'destructive' });
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      toast({ title: 'Code invalide', description: 'Vérifie le code dans ton app d\'authentification.', variant: 'destructive' });
      setCode('');
      setVerifying(false);
      return;
    }

    onVerified();
    setVerifying(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="w-full max-w-sm mx-auto px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-16 h-16 mx-auto mb-4"
      >
        <img src={logo} alt="Union" className="w-full h-full object-contain" />
      </motion.div>

      <div className="w-12 h-12 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
        <Shield className="w-6 h-6 text-primary-foreground" />
      </div>

      <h2 className="text-xl font-bold font-heading mb-2">Vérification A2F</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Entre le code à 6 chiffres de ton application d'authentification.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Code de vérification</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="h-14 rounded-xl text-center text-3xl tracking-[0.5em] font-mono glass border-border"
            maxLength={6}
            inputMode="numeric"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
          />
        </div>

        <Button
          onClick={handleVerify}
          disabled={verifying || code.length !== 6}
          className="w-full h-12 rounded-xl text-base font-semibold gradient-primary border-0"
        >
          {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Vérifier'}
        </Button>

        <button
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Annuler et se déconnecter
        </button>
      </div>
    </motion.div>
  );
}
