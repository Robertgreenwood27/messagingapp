// app/(auth)/layout.tsx
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/conversations/conversation-list";
import { NewConversationDialog } from "@/components/conversations/new-conversation-dialog";
import { OnlineStatusProvider } from "@/components/providers/online-status-provider";
import PersonalNotes from "@/components/notes/personalNotes";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Pencil, Menu } from 'lucide-react';
import { useState, Suspense, useEffect } from "react";

function AuthLayoutContent({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentConversationId = searchParams.get("conversation");
  const [showNotes, setShowNotes] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const supabase = createClient();

  // Handle window resize
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleConversationSelect = (conversationId: string) => {
    setShowNotes(false);
    setIsMobileMenuOpen(false);
    router.push(`/chat?conversation=${conversationId}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleNotes = () => {
    setShowNotes(!showNotes);
    setIsMobileMenuOpen(false);
    if (!showNotes) {
      router.push('/chat');
    }
  };

  return (
    <OnlineStatusProvider>
      <div className="flex h-screen">
        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="absolute top-4 left-4 z-50 md:hidden p-2 rounded-lg
                     bg-black/20 hover:bg-black/30 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}

        {/* Sidebar */}
        <aside 
          className={`
            ${isMobile 
              ? `fixed inset-y-0 left-0 z-40 w-80 transform transition-transform duration-300 ease-in-out
                 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                 bg-black border-r border-white/5` // Changed background for mobile
              : 'w-80 border-r bg-slate-50/50 dark:bg-slate-950/50'}
            flex flex-col
          `}
        >
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Messages</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleNotes}
                  className={`h-8 w-8 p-0 hover:bg-white/5 hover:shadow-[0_0_10px_rgba(16,185,129,0.05)] 
                           transition-all duration-300
                           ${showNotes ? 'text-emerald-500' : ''}`}
                >
                  <Pencil className="h-5 w-5" />
                </Button>
                <NewConversationDialog />
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleLogout}
                  title="Logout"
                  className="h-8 w-8 p-0 hover:bg-white/5"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
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

        {/* Mobile Overlay */}
        {isMobile && isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {showNotes ? <PersonalNotes /> : children}
        </main>
      </div>
    </OnlineStatusProvider>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex h-screen">
        <aside className="w-80 border-r bg-slate-50/50 dark:bg-slate-950/50">
          <div className="p-4 animate-pulse">Loading...</div>
        </aside>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">Loading content...</div>
        </main>
      </div>
    }>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </Suspense>
  );
}
