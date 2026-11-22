import { Users, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getUniversityShortName } from "@/shared/constants/universities";

export interface HubCourseSummary {
  id: string;
  name: string;
  short_name: string;
  code: string;
  university_id: string;
  faculty: string;
  year: string;
  memberCount: number;
  lastMessage?: string;
}

interface JoinHubDialogProps {
  course: HubCourseSummary | null;
  joining: boolean;
  onClose: () => void;
  onConfirm: (course: HubCourseSummary) => void;
}

export function JoinHubDialog({ course, joining, onClose, onConfirm }: JoinHubDialogProps) {
  return (
    <Dialog open={Boolean(course)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-heading">Rejoindre le salon</DialogTitle>
          <DialogDescription>
            {course && (
              <>
                Veux-tu rejoindre <span className="font-semibold text-foreground">{course.short_name || course.name}</span>{" "}
                <span className="font-mono text-xs">({course.code})</span> —{" "}
                {getUniversityShortName(course.university_id)} · {course.faculty} {course.year} ?
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {course && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <Users className="w-3.5 h-3.5" />
            <span>
              {course.memberCount} étudiant{course.memberCount !== 1 ? "s" : ""} membre
              {course.memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={joining}>
            Annuler
          </Button>
          <Button onClick={() => course && onConfirm(course)} disabled={joining}>
            {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Rejoindre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
