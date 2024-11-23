import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface DeleteMessageDialogProps {
  onDelete: () => Promise<void>;
}

export function DeleteMessageDialog({ onDelete }: DeleteMessageDialogProps) {
  const [heatPhase, setHeatPhase] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      interval = setInterval(() => {
        setHeatPhase(p => (p + 0.02) % (Math.PI * 2));
      }, 16);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 p-0 opacity-0 group-hover:opacity-100 
                     transition-all duration-300 overflow-hidden
                     border border-transparent
                     hover:border-red-500/10
                     hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]
                     focus:outline-none focus:ring-0"
        >
          <div className="absolute inset-0 bg-red-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />
          <Trash2 className="h-4 w-4 relative z-10 transition-colors duration-300 text-white/50 hover:text-red-400/70" />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent 
        className="relative overflow-hidden bg-black/90 border border-white/5 
                   backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.5)]"
      >
        {/* Ambient background effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `linear-gradient(${heatPhase * 30}deg, 
              rgba(239, 68, 68, 0.05), 
              rgba(255, 100, 100, 0.08)
            )`
          }}
        >
          <div className="absolute inset-0 animate-pulse-move" />
        </div>

        <AlertDialogHeader className="relative z-10">
          <AlertDialogTitle className="text-white/90">Delete Message</AlertDialogTitle>
          <AlertDialogDescription className="text-white/50">
            This action cannot be undone. The message will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="relative z-10 space-x-2">
          <AlertDialogCancel 
            className="bg-black/20 border border-white/5 text-white/70
                       hover:bg-black/30 hover:border-white/10 hover:text-white/90
                       focus:outline-none focus:ring-0
                       transition-all duration-300"
          >
            Cancel
          </AlertDialogCancel>
          
          <AlertDialogAction 
            onClick={() => onDelete()}
            className="relative overflow-hidden
                       bg-red-500/10 text-red-400/90
                       hover:bg-red-500/20 hover:text-red-400
                       border border-red-500/20
                       hover:border-red-500/30
                       hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]
                       focus:outline-none focus:ring-0
                       transition-all duration-300"
          >
            <div 
              className="absolute inset-0 animate-pulse-move"
              style={{
                background: `linear-gradient(90deg,
                  transparent 0%,
                  rgba(239, 68, 68, 0.1) 25%,
                  rgba(255, 100, 100, 0.15) 50%,
                  rgba(239, 68, 68, 0.1) 75%,
                  transparent 100%
                )`
              }}
            />
            <span className="relative z-10">Delete</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}