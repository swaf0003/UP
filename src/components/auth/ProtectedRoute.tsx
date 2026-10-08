import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AuthPage from '@/pages/AuthPage';
import MFAChallenge from '@/components/auth/MFAChallenge';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChecked, setMfaChecked] = useState(false);

  useEffect(() => {
    const checkMFA = async () => {
      if (!user) {
        setMfaChecked(true);
        setMfaRequired(false);
        return;
      }
      
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
        setMfaRequired(true);
      } else {
        setMfaRequired(false);
      }
      setMfaChecked(true);
    };

    if (user) {
      checkMFA();
    } else {
      setMfaChecked(true);
      setMfaRequired(false);
    }
  }, [user]);

  if (loading || !mfaChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <MFAChallenge
          onVerified={() => setMfaRequired(false)}
          onCancel={async () => {
            await supabase.auth.signOut();
            setMfaRequired(false);
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
