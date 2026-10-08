import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  deleting?: boolean;
}

const DeleteMessageDialog = ({ open, onOpenChange, onConfirm, deleting }: DeleteMessageDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="rounded-2xl max-w-xs">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-center font-heading flex items-center justify-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Supprimer le message
        </AlertDialogTitle>
        <AlertDialogDescription className="text-center">
          Ce message sera supprimé définitivement. Cette action est irréversible.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex gap-2 sm:gap-2">
        <AlertDialogCancel className="flex-1 rounded-xl">Annuler</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {deleting ? "Suppression..." : "Supprimer"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default DeleteMessageDialog;
