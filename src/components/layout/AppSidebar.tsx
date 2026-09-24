import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Brain,
  GraduationCap,
  Home,
  LineChart,
  Settings,
  Target,
  ListChecks,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useStudies } from "@/lib/studies-store";

const mainItems = [
  { title: "Início", to: "/", icon: Home },
  { title: "Meus estudos", to: "/studies", icon: BookOpen },
  { title: "Flashcards", to: "/flashcards", icon: Brain },
  { title: "Revisões", to: "/reviews", icon: Target },
  { title: "Quizzes", to: "/quizzes", icon: ListChecks },
  { title: "Meu progresso", to: "/progress", icon: LineChart },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { subjects } = useStudies();

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-4" />
          </span>
          {!collapsed ? <span className="font-serif text-lg font-semibold">StudyAI</span> : null}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.title}>
                    <Link to={item.to}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Minhas matérias</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {subjects.map((subject) => (
                <SidebarMenuItem key={subject.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/studies/${subject.id}`}
                    tooltip={subject.name}
                  >
                    <Link to="/studies/$id" params={{ id: subject.id }}>
                      <span aria-hidden className="text-base leading-none">
                        {subject.icon}
                      </span>
                      <span className="truncate">{subject.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Configurações">
              <Link to="/settings">
                <Settings className="size-4" />
                <span>Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
