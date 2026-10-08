import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check } from 'lucide-react';

export default function MFAEnroll() {
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<any[]>([]);
  const [unenrolling, setUnenrolling] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check existing factors on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const totpFactors = data?.totp || [];
      setFactors(totpFactors);
      setEnrolled(totpFactors.some((f: any) => f.status === 'verified'));
      setLoading(false);
    })();
  }, []);

  const handleEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Union Project',
    });
    if (error) {
      toast.error(error.message);
      setEnrolling(false);
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setEnrolling(false);
  };

  const handleVerify = async () => {
    if (!factorId || verifyCode.length !== 6) return;
    setVerifying(true);
    
    const { error: challengeError, data: challengeData } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      toast.error(challengeError.message);
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode,
    });
    if (verifyError) {
      toast.error('Code invalide. Réessaie.');
      setVerifying(false);
      return;
    }

    toast.success('A2F activée avec succès ! 🔒');
    setEnrolled(true);
    setQrCode(null);
    setSecret(null);
    setVerifying(false);
  };

  const handleUnenroll = async () => {
    const verifiedFactor = factors.find((f: any) => f.status === 'verified');
    if (!verifiedFactor) return;
    
    setUnenrolling(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('A2F désactivée');
      setEnrolled(false);
      setFactors([]);
    }
    setUnenrolling(false);
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Shield className="w-4 h-4 text-muted-foreground" />
          Authentification à deux facteurs (A2F)
        </div>
        {enrolled && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
            Activée
          </span>
        )}
      </div>

      {enrolled && !qrCode && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Ton compte est protégé par l'authentification à deux facteurs. Un code sera demandé à chaque connexion.
          </p>
          <Button
            onClick={handleUnenroll}
            disabled={unenrolling}
            variant="outline"
            className="w-full rounded-xl h-10 text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {unenrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldOff className="w-4 h-4 mr-2" />}
            Désactiver l'A2F
          </Button>
        </div>
      )}

      {!enrolled && !qrCode && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Protège ton compte avec une application d'authentification (Google Authenticator, Authy, etc.). Un code à 6 chiffres sera demandé à chaque connexion.
          </p>
          <Button
            onClick={handleEnroll}
            disabled={enrolling}
            className="w-full rounded-xl h-10 text-sm gradient-primary text-primary-foreground"
          >
            {enrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
            Activer l'A2F
          </Button>
        </div>
      )}

      {qrCode && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Scanne ce QR code avec ton app d'authentification, puis entre le code à 6 chiffres pour confirmer.
          </p>
          
          <div className="flex justify-center p-4 bg-white rounded-xl">
            <img src={qrCode} alt="QR Code A2F" className="w-48 h-48" />
          </div>

          {secret && (
            <div className="space-y-1">
              <p className="text-[0.65rem] text-muted-foreground">Ou entre cette clé manuellement :</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted/50 rounded-lg px-3 py-2 font-mono break-all select-all">
                  {secret}
                </code>
                <button onClick={copySecret} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Code de vérification</Label>
            <Input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="h-12 rounded-xl text-center text-2xl tracking-[0.5em] font-mono glass border-border"
              maxLength={6}
              inputMode="numeric"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => { setQrCode(null); setSecret(null); setFactorId(null); setVerifyCode(''); }}
              variant="outline"
              className="flex-1 rounded-xl h-10 text-sm"
            >
              Annuler
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verifying || verifyCode.length !== 6}
              className="flex-1 rounded-xl h-10 text-sm gradient-primary text-primary-foreground"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Vérifier
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
