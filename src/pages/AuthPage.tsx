import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import LoginForm from '@/components/auth/LoginForm';
import SignupWizard from '@/components/auth/SignupWizard';
import OTPVerification from '@/components/auth/OTPVerification';
import WelcomeAnimation from '@/components/auth/WelcomeAnimation';
import MFAChallenge from '@/components/auth/MFAChallenge';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { Users, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';

type AuthView = 'landing' | 'login' | 'signup' | 'otp' | 'welcome' | 'mfa' | 'forgot';

export default function AuthPage() {
  const [view, setView] = useState<AuthView>('landing');
  const [otpEmail, setOtpEmail] = useState('');

  if (view === 'welcome') return <WelcomeAnimation />;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Subtle precision grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-8 px-4">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.14 }}
              className="w-full max-w-sm mx-auto text-center"
            >
              {/* Logo */}
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl border border-border bg-card p-2.5 flex items-center justify-center shadow-sm">
                <img src={logo} alt="Union Project" className="w-full h-full object-contain rounded-lg" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card text-[0.68rem] font-mono text-muted-foreground mb-4">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                Réseau vérifié · Universités belges (.be)
              </div>

              <h1 className="text-3xl font-bold font-heading tracking-tight text-foreground mb-2.5">
                Union Project
              </h1>

              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                L'espace de travail des étudiants belges : hubs de cours, synthèses vérifiées et tutorat entre pairs.
              </p>

              {/* 3 Core Pillars */}
              <div className="grid grid-cols-3 gap-2.5 mb-8">
                {[
                  { icon: BookOpen, label: "L'Archive" },
                  { icon: Users, label: "Le Hub" },
                  { icon: GraduationCap, label: "Tutorat" },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-3.5 flex flex-col items-center gap-2"
                  >
                    <f.icon className="w-5 h-5 text-primary" />
                    <span className="text-xs font-medium text-foreground">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="space-y-2.5">
                <Button
                  onClick={() => setView('signup')}
                  className="w-full h-11 rounded-lg text-sm font-semibold"
                  size="lg"
                >
                  S'inscrire avec mon email .be
                </Button>
                <Button
                  onClick={() => setView('login')}
                  variant="outline"
                  className="w-full h-11 rounded-lg text-sm font-medium border-border"
                  size="lg"
                >
                  Connexion
                </Button>
              </div>

              <p className="mt-7 text-[0.7rem] font-mono text-muted-foreground">
                ULB · UCLouvain · ULiège · UMons · UNamur · VUB · UGent
              </p>
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
