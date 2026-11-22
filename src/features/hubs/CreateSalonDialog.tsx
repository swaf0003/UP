import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UNIVERSITIES, FACULTIES, ACADEMIC_YEARS } from "@/shared/constants/universities";

interface CreateSalonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultUniversity?: string;
  defaultFaculty?: string;
  defaultYear?: string;
  onCreated: () => void;
}

export function CreateSalonDialog({
  open,
  onOpenChange,
  defaultUniversity = "ulb",
  defaultFaculty = "Médecine",
  defaultYear = "BA1",
  onCreated,
}: CreateSalonDialogProps) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [code, setCode] = useState("");
  const [universityId, setUniversityId] = useState(defaultUniversity);
  const [faculty, setFaculty] = useState(defaultFaculty);
  const [year, setYear] = useState(defaultYear);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Nom et code du cours requis");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("courses").insert({
      name: name.trim(),
      short_name: shortName.trim() || name.trim(),
      code: code.trim().toUpperCase(),
      university_id: universityId,
      faculty,
      year,
      credits: 5,
      semester: 1,
    });
    setCreating(false);

    if (error) {
      toast.error(error.message || "Erreur lors de la création du salon");
      return;
    }

    toast.success("Salon créé ✓");
    setName("");
    setShortName("");
    setCode("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-heading">Nouveau salon de cours</DialogTitle>
          <DialogDescription>
            Crée un hub de discussion pour un cours universitaire belge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Nom complet du cours</Label>
            <Input
              placeholder="ex: Algèbre linéaire et géométrie"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nom court</Label>
              <Input
                placeholder="ex: Algèbre"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Code du cours</Label>
              <Input
                placeholder="ex: MATH-F101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Université</Label>
            <Select value={universityId} onValueChange={setUniversityId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIVERSITIES.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Faculté</Label>
              <Select value={faculty} onValueChange={setFaculty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACULTIES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Année</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACADEMIC_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={creating || !name.trim() || !code.trim()}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Créer le salon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
