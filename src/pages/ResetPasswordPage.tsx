import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const hasRecoveryToken =
      hashParams.get('type') === 'recovery' ||
      queryParams.get('type') === 'recovery' ||
      Boolean(queryParams.get('code'));

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValid(true);
        setReady(true);
      }
    });

    const timer = setTimeout(() => {
      if (!hasRecoveryToken) {
        setValid(false);
      }
      setReady(true);
    }, 800);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10) {
      toast.error('Le mot de passe doit faire au moins 10 caractères');
      return;
    }
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
      return;
    }
    toast.success('Mot de passe mis à jour !');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl glass flex items-center justify-center">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold font-heading text-center mb-2">Nouveau mot de passe</h1>

        {!ready ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !valid ? (
          <div className="text-center space-y-4 mt-4">
            <p className="text-muted-foreground text-sm">
              Ce lien de réinitialisation est invalide ou expiré. Demande un nouveau lien depuis la page de connexion.
            </p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full h-12 rounded-xl border-2">
              Retour
            </Button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground text-center mb-8 text-sm">
              Choisis un nouveau mot de passe pour ton compte.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 border-border pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 border-border"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full h-12 rounded-xl text-base font-semibold gradient-primary border-0"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Mettre à jour'}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
