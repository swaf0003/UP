import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { isAcademicEmail } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PasswordStrength from './PasswordStrength';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, User, Calendar, GraduationCap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignupWizardProps {
  onBack: () => void;
  onOtpSent: (email: string) => void;
}

const universities = [
  { id: 'ulb', name: 'ULB – Université Libre de Bruxelles' },
  { id: 'uclouvain', name: 'UCLouvain' },
  { id: 'uliege', name: 'ULiège – Université de Liège' },
  { id: 'umons', name: 'UMons – Université de Mons' },
  { id: 'unamur', name: 'UNamur – Université de Namur' },
  { id: 'uantwerpen', name: 'UAntwerpen' },
  { id: 'ugent', name: 'UGent – Universiteit Gent' },
  { id: 'uhasselt', name: 'UHasselt' },
  { id: 'vub', name: 'VUB – Vrije Universiteit Brussel' },
];

const faculties = ['Polytechnique', 'Médecine'];
const years = ['BA1', 'BA2', 'BA3', 'MA1', 'MA2'];

const STEP_COUNT = 4;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 100 : -100, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -100 : 100, opacity: 0 }),
};

export default function SignupWizard({ onBack, onOtpSent }: SignupWizardProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [year, setYear] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 0) nameRef.current?.focus();
      if (step === 3) emailRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
    return () => clearTimeout(timer);
  }, [step]);

  const next = () => { setDir(1); setStep((s) => Math.min(s + 1, STEP_COUNT - 1)); };
  const prev = () => { setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const canNext = () => {
    if (step === 0) return name.trim().length >= 2 && gender !== '';
    if (step === 1) return dobDay !== '' && dobMonth !== '' && dobYear !== '';
    if (step === 2) return university !== '' && faculty !== '' && year !== '';
    if (step === 3) return email !== '' && password.length >= 6;
    return false;
  };

  const handleSubmit = async () => {
    if (!isAcademicEmail(email)) {
      toast({
        title: '📧 Email non académique',
        description: "Utilise ton email universitaire (.be) pour rejoindre l'Union. Les emails personnels (Gmail, Outlook...) ne sont pas acceptés.",
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    // 1. Sign up with Supabase (auto-confirm OFF → confirmation email sent automatically)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          gender,
          date_of_birth: `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`,
          university,
          faculty,
          academic_year: year,
        },
      },
    });

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (data.user && !data.user.identities?.length) {
      toast({
        title: 'Compte existant',
        description: 'Un compte existe déjà avec cet email. Essaie de te connecter.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Supabase sends confirmation email automatically (auto-confirm is OFF)
    onOtpSent(email);
    setLoading(false);
  };

  const stepIcons = [User, Calendar, GraduationCap, ShieldCheck];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-sm mx-auto px-4"
    >
      <button
        onClick={step === 0 ? onBack : prev}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">{step === 0 ? 'Retour' : 'Précédent'}</span>
      </button>

      <div className="flex gap-2 mb-8">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-500',
              i <= step ? 'gradient-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
          {(() => {
            const Icon = stepIcons[step];
            return <Icon className="w-5 h-5 text-primary-foreground" />;
          })()}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Étape {step + 1}/{STEP_COUNT}</p>
          <p className="font-semibold font-heading">
            {['Ton identité', 'Ton âge', 'Ton parcours', 'Sécurité'][step]}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={step}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input
                  ref={nameRef}
                  placeholder="Ton prénom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-xl bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Genre</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'male', label: '♂ Homme' },
                    { value: 'female', label: '♀ Femme' },
                    { value: 'other', label: '⚧ Autre' },
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      className={cn(
                        'h-12 rounded-xl border-2 text-sm font-medium transition-all',
                        gender === g.value
                          ? 'border-primary bg-accent text-accent-foreground'
                          : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Label>Date de naissance</Label>
              <p className="text-xs text-muted-foreground -mt-2">Sélectionne ton jour, mois et année de naissance.</p>
              <div className="grid grid-cols-3 gap-3">
                {/* Day */}
                <div className="space-y-1.5">
                  <span className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider">Jour</span>
                  <Select value={dobDay} onValueChange={setDobDay}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/50 text-base font-semibold">
                      <SelectValue placeholder="--" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>{String(d).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Month */}
                <div className="space-y-1.5">
                  <span className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider">Mois</span>
                  <Select value={dobMonth} onValueChange={setDobMonth}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/50 text-base font-semibold">
                      <SelectValue placeholder="--" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'].map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Year */}
                <div className="space-y-1.5">
                  <span className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider">Année</span>
                  <Select value={dobYear} onValueChange={setDobYear}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/50 text-base font-semibold">
                      <SelectValue placeholder="--" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - 16 - i).map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {dobDay && dobMonth && dobYear && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center p-3 rounded-xl bg-muted/30"
                >
                  <p className="text-sm font-medium text-foreground">
                    🎂 {dobDay.padStart(2, '0')}/{dobMonth.padStart(2, '0')}/{dobYear}
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Université</Label>
                <Select value={university} onValueChange={setUniversity}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/50">
                    <SelectValue placeholder="Choisis ton université" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Faculté</Label>
                <Select value={faculty} onValueChange={setFaculty}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/50">
                    <SelectValue placeholder="Choisis ta faculté" />
                  </SelectTrigger>
                  <SelectContent>
                    {faculties.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <div className="grid grid-cols-5 gap-2">
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setYear(y)}
                      className={cn(
                        'h-11 rounded-xl border-2 text-sm font-semibold transition-all',
                        year === y
                          ? 'border-primary bg-accent text-accent-foreground'
                          : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Email académique</Label>
                <Input
                  ref={emailRef}
                  type="email"
                  placeholder="prenom.nom@student.uliege.be"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Seuls les emails universitaires belges (.be) sont acceptés.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8">
        {step < STEP_COUNT - 1 ? (
          <Button
            onClick={next}
            disabled={!canNext()}
            className="w-full h-12 rounded-xl text-base font-semibold gradient-primary border-0"
          >
            Continuer
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canNext() || loading}
            className="w-full h-12 rounded-xl text-base font-semibold gradient-primary border-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Créer mon compte'}
          </Button>
        )}
      </div>

      <p className="text-center mt-6 text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <button onClick={onBack} className="text-primary font-medium hover:underline">
          Se connecter
        </button>
      </p>
    </motion.div>
  );
}
