// components/messages/delete-message-dialog.tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteMessageDialogProps {
  messageId: string;
  onDelete: () => Promise<void>;
}

export function DeleteMessageDialog({ messageId, onDelete }: DeleteMessageDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 
                     transition-all duration-300 
                     hover:bg-red-500/10 hover:border-red-500/20
                     hover:shadow-[0_0_10px_rgba(239,68,68,0.05)]"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-black/90 border border-white/5">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Message</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The message will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-black/20 border-white/5 hover:bg-black/30">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => onDelete()}
            className="bg-red-500/10 text-red-500 
                     hover:bg-red-500/20 hover:text-red-400
                     border border-red-500/20
                     transition-all duration-300"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}