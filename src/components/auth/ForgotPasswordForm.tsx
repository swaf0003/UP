import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBack: () => void;
  defaultEmail?: string;
}

export default function ForgotPasswordForm({ onBack, defaultEmail = '' }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    setSent(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-sm mx-auto px-4"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Retour</span>
      </button>

      {sent ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl glass flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-heading">Vérifie tes emails</h2>
          <p className="text-muted-foreground text-sm">
            Si un compte existe pour <span className="text-foreground font-medium">{email}</span>, tu recevras un lien
            pour réinitialiser ton mot de passe.
          </p>
          <Button onClick={onBack} variant="outline" className="w-full h-12 rounded-xl border-2">
            Retour à la connexion
          </Button>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold font-heading mb-2">Mot de passe oublié</h2>
          <p className="text-muted-foreground mb-8">
            Entre ton email académique, on t'envoie un lien de réinitialisation.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email académique</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="prenom.nom@student.uliege.be"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-muted/50 border-border"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-semibold gradient-primary border-0"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Envoyer le lien'}
            </Button>
          </form>
        </>
      )}
    </motion.div>
  );
}
