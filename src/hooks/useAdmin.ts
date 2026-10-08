import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setIsOwner(false);
        setRole(null);
        setLoading(false);
        return;
      }

      // Get user's role directly
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const userRoles = roles?.map((r) => r.role) || [];
      const ownerCheck = userRoles.includes("owner" as any);
      const adminCheck = ownerCheck || userRoles.includes("admin" as any);

      setIsOwner(ownerCheck);
      setIsAdmin(adminCheck);
      setRole(ownerCheck ? "owner" : adminCheck ? "admin" : userRoles[0] || null);
      setLoading(false);
    };

    checkRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkRoles();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, isOwner, role, loading };
};
