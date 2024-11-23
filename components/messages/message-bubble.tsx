import { useState, useRef } from 'react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Message } from "@/lib/supabase/database.types";

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  age: number;
  onRetry?: (tempId: string) => void;
  onDelete?: (messageId: string) => void;
  onDeleteFailed?: (tempId: string) => void;
}

export function MessageBubble({ 
  message,
  isCurrentUser,
  age,
  onRetry,
  onDelete,
  onDeleteFailed
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const messageRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!messageRef.current) return;
    const rect = messageRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
  };

  const isRead = message.read_receipts?.some(
    receipt => receipt.user_id !== message.sender_id
  );

  // Calculate color based on message age
  const getMessageColor = () => {
    const progress = Math.min(age / 5000, 1);
    if (progress < 0.5) {
      return {
        text: isCurrentUser 
          ? `rgba(224, 255, 255, ${0.9 - progress * 0.4})`
          : `rgba(230, 230, 255, ${0.9 - progress * 0.4})`,
        glow: isCurrentUser
          ? `0 0 ${20 - progress * 15}px rgba(0, 255, 240, ${0.3 - progress * 0.25})`
          : `0 0 ${20 - progress * 15}px rgba(147, 160, 255, ${0.3 - progress * 0.25})`
      };
    }
    return {
      text: isCurrentUser ? 'rgba(224, 255, 255, 0.7)' : 'rgba(230, 230, 255, 0.7)',
      glow: 'none'
    };
  };

  const colors = getMessageColor();

  return (
    <div 
      ref={messageRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative max-w-[80%] group transition-transform duration-300 ease-out",
        isCurrentUser ? "ml-auto" : "",
        isHovered ? "scale-[1.02]" : "scale-100"
      )}
    >
      {/* Liquid crystal background effect */}
      <div 
        className="absolute inset-0 rounded-lg transition-opacity duration-500"
        style={{
          background: `
            radial-gradient(
              circle at ${mousePos.x}% ${mousePos.y}%,
              ${isCurrentUser 
                ? 'rgba(0, 255, 240, 0.03)' 
                : 'rgba(147, 160, 255, 0.03)'
              } 0%,
              transparent 70%
            ),
            linear-gradient(
              ${isCurrentUser ? '135deg' : '225deg'},
              ${isCurrentUser 
                ? 'rgba(0, 255, 240, 0.02)' 
                : 'rgba(147, 160, 255, 0.02)'
              } 0%,
              transparent 60%
            )
          `,
          backdropFilter: 'blur(8px)',
          opacity: isHovered ? 1 : 0.5
        }}
      />

      {/* Content container */}
      <div className="relative p-3 z-10">
        <div className={cn(
          "flex items-start gap-2",
          isCurrentUser ? "flex-row-reverse" : ""
        )}>
          {!isCurrentUser && (
            <Avatar className="w-6 h-6">
              <AvatarImage src={message.sender?.avatar_url || undefined} />
              <AvatarFallback 
                className="bg-transparent border border-white/10"
              >
                {message.sender?.username?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className={cn(
            "flex-1 space-y-1",
            isCurrentUser ? "text-right" : ""
          )}>
            <p 
              className="break-words text-sm transition-all duration-300"
              style={{
                color: colors.text,
                textShadow: colors.glow
              }}
            >
              {message.content}
            </p>

            {isCurrentUser && !message.status && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 opacity-0 group-hover:opacity-100",
                      "transition-all duration-300",
                      "hover:bg-white/5",
                      "focus:opacity-100"
                    )}
                  >
                    <Trash2 className="h-4 w-4 text-white/30" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-black/90 border border-white/5">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white/70">Delete Message</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/50">
                      This action cannot be undone. The message will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-black/20 border-white/5 hover:bg-black/30 text-white/70">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDelete(message.id)}
                      className="bg-red-500/10 text-red-500/70 
                               hover:bg-red-500/20 hover:text-red-500/90
                               border border-red-500/20
                               transition-all duration-300"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Metadata */}
            <div 
              className={cn(
                "flex items-center gap-2 text-xs transition-all duration-500",
                isCurrentUser ? "justify-end" : "",
                isHovered ? "opacity-50" : "opacity-0"
              )}
            >
              <time className="text-white/30">
                {format(new Date(message.created_at), 'HH:mm')}
              </time>
              
              {isCurrentUser && (
                <span className="text-white/30">
                  {isRead ? (
                    <CheckCheck className="w-3 h-3" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </span>
              )}

              {message.status === 'sending' && (
                <span className="text-emerald-500/50">Sending...</span>
              )}

              {message.status === 'failed' && onRetry && onDeleteFailed && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRetry(message.tempId!)}
                    className="h-6 px-2 text-white/30 hover:text-white/50 hover:bg-white/5"
                  >
                    Retry
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteFailed(message.tempId!)}
                    className="h-6 px-2 text-white/30 hover:text-white/50 hover:bg-white/5"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}