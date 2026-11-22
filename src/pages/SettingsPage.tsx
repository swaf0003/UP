import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, User, GraduationCap, Lock, Moon, Sun, Palette, Check, CalendarDays, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { isSafeHttpUrl } from "@/lib/urlValidation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useChatTheme, appAccents } from "@/contexts/ChatThemeContext";
import { cn } from "@/lib/utils";
import MFAEnroll from "@/components/auth/MFAEnroll";

const universities = [
  { id: "ulb", name: "ULB" }, { id: "uclouvain", name: "UCLouvain" }, { id: "uliege", name: "ULiège" },
  { id: "umons", name: "UMons" }, { id: "unamur", name: "UNamur" }, { id: "uantwerpen", name: "UAntwerpen" },
  { id: "ugent", name: "UGent" }, { id: "uhasselt", name: "UHasselt" }, { id: "vub", name: "VUB" },
];

const faculties = [
  "Médecine", "Polytechnique", "Droit", "Sciences", "Économie",
  "Philosophie & Lettres", "Psychologie", "Sciences sociales", "Informatique",
];

const years = ["BAC 1", "BAC 2", "BAC 3", "MA 1", "MA 2"];

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Minimum 2 caractères").max(50, "Maximum 50 caractères"),
  university: z.string().min(1, "Choisis une université"),
  faculty: z.string().min(1, "Choisis une faculté"),
  academic_year: z.string().min(1, "Choisis une année"),
});

const SettingsPage = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, user, signOut } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const { accent, setAccentId } = useChatTheme();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [icsLink, setIcsLink] = useState("");
  const [syncingICS, setSyncingICS] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    university: "",
    faculty: "",
    academic_year: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || "",
        university: profile.university || "",
        faculty: profile.faculty || "",
        academic_year: profile.academic_year || "",
      });
    }
  }, [profile]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSave = async () => {
    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        fieldErrors[e.path[0] as string] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    await updateProfile(result.data);
    toast.success("Profil mis à jour !");
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current) {
      toast.error("Entre ton mot de passe actuel pour confirmer");
      return;
    }
    if (!passwordForm.new || passwordForm.new.length < 10) {
      toast.error("Le nouveau mot de passe doit faire au moins 10 caractères");
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (!user?.email) {
      toast.error("Session utilisateur introuvable");
      return;
    }

    setChangingPassword(true);
    // Re-authenticate with current password before permitting password change
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwordForm.current,
    });
    if (reauthError) {
      toast.error("Mot de passe actuel incorrect");
      setChangingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
    if (error) {
      toast.error(error.message || "Erreur lors du changement de mot de passe");
    } else {
      toast.success("Mot de passe mis à jour !");
      setPasswordForm({ current: "", new: "", confirm: "" });
    }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      toast.error("Impossible de supprimer le compte pour le moment.");
      setDeletingAccount(false);
      return;
    }
    toast.success("Ton compte et toutes tes données ont été supprimés.");
    await signOut();
    navigate("/");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-heading font-bold text-foreground">Paramètres</h1>
      </div>

      {/* Personal Info */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <User className="w-4 h-4 text-muted-foreground" />
          Informations personnelles
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Nom d'affichage</Label>
          <Input id="display_name" value={form.display_name} onChange={(e) => handleChange("display_name", e.target.value)} placeholder="Ton nom" className="rounded-xl glass border-border" maxLength={50} />
          {errors.display_name && <p className="text-xs text-destructive">{errors.display_name}</p>}
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email || ""} disabled className="rounded-xl glass border-border opacity-60" />
          <p className="text-[0.65rem] text-muted-foreground">L'email ne peut pas être modifié</p>
        </div>
      </div>

      {/* Studies */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          Études
        </div>
        <div className="space-y-2">
          <Label>Université</Label>
          <Select value={form.university} onValueChange={(v) => handleChange("university", v)}>
            <SelectTrigger className="rounded-xl glass border-border"><SelectValue placeholder="Choisis ton université" /></SelectTrigger>
            <SelectContent>{universities.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
          {errors.university && <p className="text-xs text-destructive">{errors.university}</p>}
        </div>
        <div className="space-y-2">
          <Label>Faculté</Label>
          <Select value={form.faculty} onValueChange={(v) => handleChange("faculty", v)}>
            <SelectTrigger className="rounded-xl glass border-border"><SelectValue placeholder="Choisis ta faculté" /></SelectTrigger>
            <SelectContent>{faculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
          {errors.faculty && <p className="text-xs text-destructive">{errors.faculty}</p>}
        </div>
        <div className="space-y-2">
          <Label>Année académique</Label>
          <Select value={form.academic_year} onValueChange={(v) => handleChange("academic_year", v)}>
            <SelectTrigger className="rounded-xl glass border-border"><SelectValue placeholder="Choisis ton année" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          {errors.academic_year && <p className="text-xs text-destructive">{errors.academic_year}</p>}
        </div>
      </div>

      {/* Save Profile */}
      <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl gradient-primary text-primary-foreground h-12 text-sm font-medium">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Sauvegarder le profil
      </Button>

      {/* ICS Calendar Sync */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          Calendrier ICS
        </div>
        <p className="text-xs text-muted-foreground">
          Colle ton lien TimeEdit ou .ics pour synchroniser tes cours dans l'Agenda.
        </p>
        <div className="space-y-2">
          <Label>Lien ICS</Label>
          <Input
            value={icsLink}
            onChange={(e) => setIcsLink(e.target.value)}
            placeholder="https://cloud.timeedit.net/..."
            className="rounded-xl glass border-border"
          />
        </div>
        <Button
          onClick={async () => {
            if (!icsLink) return;
            if (!isSafeHttpUrl(icsLink, true)) {
              toast.error("Le lien ICS doit commencer par https://");
              return;
            }
            setSyncingICS(true);
            const { data, error } = await supabase.functions.invoke("sync-ics", { body: { ics_url: icsLink.trim() } });
            if (error) {
              toast.error("Erreur de synchronisation ICS");
            } else {
              toast.success(`${data.count} événements importés !`);
            }
            setSyncingICS(false);
          }}
          disabled={!icsLink || syncingICS}
          variant="outline"
          className="w-full rounded-xl h-10 text-sm"
        >
          {syncingICS ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {syncingICS ? "Synchronisation..." : "Synchroniser le calendrier"}
        </Button>
      </div>

      {/* Password */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Lock className="w-4 h-4 text-muted-foreground" />
          Changer le mot de passe
        </div>
        <div className="space-y-2">
          <Label>Mot de passe actuel</Label>
          <Input type="password" value={passwordForm.current} onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))} placeholder="••••••••••" className="rounded-xl glass border-border" />
        </div>
        <div className="space-y-2">
          <Label>Nouveau mot de passe (min. 10 caractères)</Label>
          <Input type="password" value={passwordForm.new} onChange={e => setPasswordForm(p => ({ ...p, new: e.target.value }))} placeholder="••••••••••" className="rounded-xl glass border-border" />
        </div>
        <div className="space-y-2">
          <Label>Confirmer</Label>
          <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••••" className="rounded-xl glass border-border" />
        </div>
        <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline" className="w-full rounded-xl h-10 text-sm">
          {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
          Changer le mot de passe
        </Button>
      </div>

      {/* MFA / 2FA */}
      <MFAEnroll />

      {/* Appearance */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {theme === "dark" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
          Apparence
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Mode sombre</p>
            <p className="text-xs text-muted-foreground">Activer le thème sombre</p>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
        </div>
      </div>

      {/* Personalization */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Palette className="w-4 h-4 text-muted-foreground" />
          Personnalisation
        </div>
        <p className="text-xs text-muted-foreground">
          Change la couleur d'accent de toute l'application : boutons, navigation, bulles de chat, badges...
        </p>
        <div className="grid grid-cols-4 gap-3">
          {appAccents.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccentId(a.id)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl transition-all flex items-center justify-center",
                a.gradient,
                accent.id === a.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"
              )}>
                {accent.id === a.id && (
                  <Check className="w-5 h-5 text-white" />
                )}
              </div>
              <span className={cn(
                "text-[0.6rem] font-medium",
                accent.id === a.id ? "text-foreground" : "text-muted-foreground"
              )}>
                {a.name}
              </span>
            </button>
          ))}
        </div>
        {/* Preview */}
        <div className="mt-3 p-3 rounded-xl bg-muted/30">
          <p className="text-[0.6rem] text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Aperçu</p>
          <div className="flex flex-col gap-2">
            <div className="self-start bg-card border border-border/60 rounded-2xl rounded-bl-md px-3.5 py-2 max-w-[75%]">
              <p className="text-[0.8rem]">Salut, ça va ? 👋</p>
            </div>
            <div className={cn("self-end rounded-2xl rounded-br-md px-3.5 py-2 max-w-[75%] text-white", accent.gradient)}>
              <p className="text-[0.8rem]">Oui super bien et toi ?</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="h-8 px-4 rounded-xl gradient-primary flex items-center">
              <span className="text-xs text-primary-foreground font-medium">Bouton</span>
            </div>
            <div className="h-8 px-4 rounded-xl gradient-accent flex items-center">
              <span className="text-xs text-accent-foreground font-medium">Badge</span>
            </div>
          </div>
        </div>
      </div>

      {/* GDPR Account Deletion */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertTriangle className="w-4 h-4" />
          Zone de danger (RGPD)
        </div>
        <p className="text-xs text-muted-foreground">
          La suppression de ton compte efface définitivement ton profil, tes messages, tes événements d'agenda et tes fichiers audio/avatar. Cette action est irréversible.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full rounded-xl h-10 text-sm" disabled={deletingAccount}>
              {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Supprimer définitivement mon compte
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ton compte Union Project ?</AlertDialogTitle>
              <AlertDialogDescription>
                Toutes tes données personnelles, messages, notes vocales et contacts seront effacés définitivement conformément au RGPD.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Oui, supprimer mon compte
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
