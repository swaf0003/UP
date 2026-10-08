import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import LoginForm from '@/components/auth/LoginForm';
import SignupWizard from '@/components/auth/SignupWizard';
import OTPVerification from '@/components/auth/OTPVerification';
import WelcomeAnimation from '@/components/auth/WelcomeAnimation';
import MFAChallenge from '@/components/auth/MFAChallenge';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { Users, BookOpen, GraduationCap } from 'lucide-react';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';

type AuthView = 'landing' | 'login' | 'signup' | 'otp' | 'welcome' | 'mfa' | 'forgot';

export default function AuthPage() {
  const [view, setView] = useState<AuthView>('landing');
  const [otpEmail, setOtpEmail] = useState('');

  if (view === 'welcome') return <WelcomeAnimation />;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-info/10 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-8 px-4">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm mx-auto text-center"
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-24 h-24 mx-auto mb-6"
              >
                <img src={logo} alt="Union Project" className="w-full h-full object-contain" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-4xl font-bold font-heading mb-3"
              >
                <span className="gradient-text">Union</span> Project
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground mb-10 text-base leading-relaxed"
              >
                La communauté étudiante belge qui révolutionne l'apprentissage universitaire.
              </motion.p>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-3 gap-3 mb-10"
              >
                {[
                  { icon: BookOpen, label: 'Ressources' },
                  { icon: Users, label: 'Communauté' },
                  { icon: GraduationCap, label: 'Parcours' },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="glass rounded-xl p-4 flex flex-col items-center gap-2"
                  >
                    <f.icon className="w-6 h-6 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <Button
                  onClick={() => setView('signup')}
                  className="w-full h-13 rounded-xl text-base font-semibold gradient-primary border-0 shadow-lg"
                  size="lg"
                >
                  S'inscrire
                </Button>
                <Button
                  onClick={() => setView('login')}
                  variant="outline"
                  className="w-full h-13 rounded-xl text-base font-semibold border-2"
                  size="lg"
                >
                  Connexion
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-8 text-xs text-muted-foreground"
              >
                Réservé aux étudiants universitaires belges 🇧🇪
              </motion.p>
            </motion.div>
          )}

          {view === 'login' && (
            <LoginForm
              key="login"
              onBack={() => setView('landing')}
              onMFARequired={() => setView('mfa')}
              onForgotPassword={(email) => {
                setOtpEmail(email);
                setView('forgot');
              }}
            />
          )}

          {view === 'forgot' && (
            <ForgotPasswordForm
              key="forgot"
              defaultEmail={otpEmail}
              onBack={() => setView('login')}
            />
          )}

          {view === 'signup' && (
            <SignupWizard
              key="signup"
              onBack={() => setView('landing')}
              onOtpSent={(email) => {
                setOtpEmail(email);
                setView('otp');
              }}
            />
          )}

          {view === 'otp' && (
            <OTPVerification
              key="otp"
              email={otpEmail}
              onVerified={() => setView('welcome')}
              onBack={() => setView('signup')}
            />
          )}

          {view === 'mfa' && (
            <MFAChallenge
              key="mfa"
              onVerified={() => {
                // MFA verified, auth state change will handle redirect
              }}
              onCancel={async () => {
                await supabase.auth.signOut();
                setView('landing');
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
