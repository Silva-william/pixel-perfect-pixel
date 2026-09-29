import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { currentUser } from "@/data/mock";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur sm:px-6">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <Avatar className="size-8">
                <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-5xl space-y-10">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
