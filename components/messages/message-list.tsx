// components/messages/message-list.tsx
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMessages } from "@/components/providers/messages-provider";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef, useEffect } from "react";
import { Check, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function MessageSkeleton({ align = "start" }: { align?: "start" | "end" }) {
  return (
    <div className={cn(
      "flex gap-2 w-full",
      align === "end" && "justify-end"
    )}>
      {align === "start" && (
        <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
      )}
      <div className={cn(
        "max-w-[80%] space-y-2",
        align === "end" && "items-end"
      )}>
        <div className="h-4 bg-muted animate-pulse rounded w-48" />
        <div className="h-3 bg-muted animate-pulse rounded w-24" />
      </div>
    </div>
  );
}

function MessageTimestamp({ date }: { date: Date }) {
  const [showFullTimestamp, setShowFullTimestamp] = useState(false);
  
  const formatMessageTimestamp = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'HH:mm');
    } else if (date.getFullYear() === new Date().getFullYear()) {
      return format(date, 'MMM d HH:mm');
    }
    return format(date, 'MMM d, yyyy HH:mm');
  };

  return (
    <span
      onMouseEnter={() => setShowFullTimestamp(true)}
      onMouseLeave={() => setShowFullTimestamp(false)}
      className="text-xs opacity-70 cursor-default"
    >
      {showFullTimestamp 
        ? formatMessageTimestamp(date)
        : formatDistanceToNow(date, { addSuffix: true })}
    </span>
  );
}

function DeleteMessageDialog({ 
  messageId, 
  onDelete 
}: { 
  messageId: string;
  onDelete: () => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Message</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The message will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => onDelete()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MessageList() {
  const { messages, isLoading, error, retryMessage, deleteFailedMessage, deleteMessage } = useMessages();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading) {
    return (
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-8">
          <MessageSkeleton align="start" />
          <MessageSkeleton align="end" />
          <MessageSkeleton align="start" />
          <MessageSkeleton align="end" />
          <MessageSkeleton align="start" />
        </div>
      </ScrollArea>
    );
  }

  if (error) return <div className="flex-1 p-4 text-red-500">Error: {error}</div>;

  let lastMessageDate: string | null = null;

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4" ref={scrollRef}>
        {messages.map((message) => {
          const isCurrentUser = message.sender_id === currentUserId;
          const messageDate = new Date(message.created_at);
          const messageDateStr = format(messageDate, 'yyyy-MM-dd');
          const showDateDivider = lastMessageDate !== messageDateStr;
          const isRead = message.read_receipts?.some(
            receipt => receipt.user_id !== currentUserId
          );
          
          if (showDateDivider) {
            lastMessageDate = messageDateStr;
          }
          
          return (
            <div key={message.id}>
              {showDateDivider && (
                <div className="flex items-center justify-center my-6">
                  <div className="bg-muted px-3 py-1 rounded-full text-xs">
                    {isToday(messageDate)
                      ? 'Today'
                      : isYesterday(messageDate)
                      ? 'Yesterday'
                      : format(messageDate, 'MMMM d, yyyy')}
                  </div>
                </div>
              )}
              <Card
                className={cn(
                  "max-w-[80%] p-3 group",
                  isCurrentUser
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "flex items-start gap-2",
                  isCurrentUser ? "flex-row-reverse" : ""
                )}>
                  {!isCurrentUser && (
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={message.sender?.avatar_url || undefined} />
                      <AvatarFallback>
                        {message.sender?.username?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    "flex-1",
                    isCurrentUser ? "text-right" : ""
                  )}>
                    <div className="flex items-start gap-2 justify-between">
                      <p className="break-words">{message.content}</p>
                      {isCurrentUser && !message.status && (
                        <DeleteMessageDialog
                          messageId={message.id}
                          onDelete={() => deleteMessage(message.id)}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                      <MessageTimestamp date={messageDate} />
                      {isCurrentUser && (
                        <span className="opacity-70">
                          {isRead ? (
                            <CheckCheck className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </span>
                      )}
                      {message.status === 'sending' && (
                        <span>Sending...</span>
                      )}
                      {message.status === 'failed' && (
                        <div className="flex items-center gap-2">
                          <span className="text-red-500">Failed to send</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryMessage(message.tempId!)}
                          >
                            Retry
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFailedMessage(message.tempId!)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
