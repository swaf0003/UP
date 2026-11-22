import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OTPVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

export default function OTPVerification({ email, onVerified, onBack }: OTPVerificationProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];

    if (value.length > 1) {
      const digits = value.slice(0, 6).split('');
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;

    setLoading(true);

    // Use Supabase's native OTP verification
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    });

    if (error) {
      toast.error('Code invalide — vérifie le code reçu par email et réessaie.');
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
      setLoading(false);
      return;
    }

    // Code verified — email_verified is synced server-side via auth.users trigger
    if (data.user) {
      const meta = data.user.user_metadata;
      await supabase.from('profiles').update({
        display_name: meta?.display_name || '',
        university: meta?.university || '',
        faculty: meta?.faculty || '',
        academic_year: meta?.academic_year || '',
      }).eq('user_id', data.user.id);
    }

    onVerified();
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) {
      toast.error("Impossible de renvoyer le code.");
    } else {
      toast.success('Code renvoyé ! Vérifie ta boîte mail (et tes spams).');
    }
    setResending(false);
  };

  const code = otp.join('');

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-sm mx-auto px-4 text-center"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Retour</span>
      </button>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6"
      >
        <Mail className="w-8 h-8 text-primary-foreground" />
      </motion.div>

      <h2 className="text-2xl font-bold font-heading mb-2">Vérifie ton email</h2>
      <p className="text-muted-foreground mb-2 text-sm">
        Un code à 6 chiffres a été envoyé à
      </p>
      <p className="font-medium text-foreground mb-6 text-sm">{email}</p>

      <div className="glass rounded-xl p-4 mb-6 text-left">
        <p className="text-sm text-muted-foreground">
          📌 Entre le <strong className="text-foreground">code à 6 chiffres</strong> reçu dans ton email pour vérifier ton compte. Pense à vérifier tes spams !
        </p>
      </div>

      {/* OTP Inputs */}
      <div className="flex justify-center gap-3 mb-8">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              'w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-muted/50 outline-none transition-all',
              digit
                ? 'border-primary text-foreground'
                : 'border-border text-muted-foreground',
              'focus:border-primary focus:ring-2 focus:ring-ring'
            )}
          />
        ))}
      </div>

      <Button
        onClick={handleVerify}
        disabled={code.length !== 6 || loading}
        className="w-full h-12 rounded-xl text-base font-semibold gradient-primary border-0 mb-4"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Vérifier le code'}
      </Button>

      <button
        onClick={handleResend}
        disabled={resending}
        className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <RefreshCw className={cn('w-4 h-4', resending && 'animate-spin')} />
        {resending ? 'Envoi en cours...' : "Renvoyer le code"}
      </button>
    </motion.div>
  );
}
