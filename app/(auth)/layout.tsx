// app/(auth)/layout.tsx
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-80 border-r bg-slate-50/50 dark:bg-slate-950/50">
        <ScrollArea className="h-screen">
          <div className="p-4 space-y-4">
            <div className="font-semibold text-lg">Messages</div>
            {/* Conversation list will go here */}
            <nav className="space-y-2">
              {/* We'll add conversation items here later */}
            </nav>
          </div>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          {children}
        </ScrollArea>
      </main>
    </div>
  );
}