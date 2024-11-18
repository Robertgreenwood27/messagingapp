// app/(auth)/layout.tsx
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationList } from "@/components/conversations/conversation-list";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentConversationId = searchParams.get("conversation");

  const handleConversationSelect = (conversationId: string) => {
    router.push(`/chat?conversation=${conversationId}`);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-80 border-r bg-slate-50/50 dark:bg-slate-950/50 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Messages</h2>
            <Button variant="ghost" size="icon">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            <ConversationList
              activeConversationId={currentConversationId || undefined}
              onConversationSelect={handleConversationSelect}
            />
          </div>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}