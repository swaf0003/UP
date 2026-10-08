import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  gender: string;
  date_of_birth: string | null;
  university: string;
  faculty: string;
  academic_year: string;
  email_verified: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer profile fetch to avoid deadlock
          setTimeout(async () => {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            setProfile(data as Profile | null);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();
    if (!error && data) setProfile(data as Profile);
    return { data, error };
  };

  return { user, session, profile, loading, signOut, updateProfile };
}

// Academic email validation
const ACADEMIC_DOMAINS = [
  'student.uliege.be', 'student.uclouvain.be', 'student.ulb.be',
  'ulb.be', 'uliege.be', 'uclouvain.be',
  'student.umons.be', 'umons.be',
  'student.unamur.be', 'unamur.be',
  'student.uantwerpen.be', 'uantwerpen.be',
  'student.ugent.be', 'ugent.be',
  'student.uhasselt.be', 'uhasselt.be',
  'student.vub.be', 'vub.be',
];

export function isAcademicEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  if (!domain.endsWith('.be')) return false;
  return ACADEMIC_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
}
