import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Identifiant d'autorisation manquant");
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Aucune redirection renvoyée par le serveur d'autorisation.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="max-w-md mx-auto py-10 text-center space-y-2">
        <h1 className="text-lg font-heading font-semibold">Autorisation impossible</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="max-w-md mx-auto py-10 text-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  const clientName = details.client?.name ?? "cette application";

  return (
    <main className="max-w-md mx-auto py-10 space-y-5">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-heading font-semibold">Connecter {clientName}</h1>
        <p className="text-sm text-muted-foreground">
          {clientName} pourra accéder à Union Project en ton nom : cours, ressources, ton profil et
          ton agenda.
        </p>
      </div>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
          Refuser
        </Button>
        <Button disabled={busy} onClick={() => decide(true)}>
          Autoriser
        </Button>
      </div>
    </main>
  );
}
