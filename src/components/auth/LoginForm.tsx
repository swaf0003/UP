import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onBack: () => void;
  onMFARequired?: () => void;
  onForgotPassword?: (email: string) => void;
}

export default function LoginForm({ onBack, onMFARequired, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : error.message
      );
    } else if (data?.session) {
      // Check if MFA is required
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
        onMFARequired?.();
        setLoading(false);
        return;
      }
    }
    setLoading(false);
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

      <h2 className="text-2xl font-bold font-heading mb-2">Content de te revoir</h2>
      <p className="text-muted-foreground mb-8">Connecte-toi à ton compte Union</p>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email académique</Label>
          <Input
            ref={emailRef}
            id="login-email"
            type="email"
            placeholder="prenom.nom@student.uliege.be"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl bg-muted/50 border-border"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">Mot de passe</Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-muted/50 border-border pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="flex justify-end -mt-2">
          <button
            type="button"
            onClick={() => onForgotPassword?.(email)}
            className="text-sm text-primary hover:underline"
          >
            Mot de passe oublié ?
          </button>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl text-base font-semibold gradient-primary border-0"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se connecter'}
        </Button>
      </form>
    </motion.div>
  );
}
