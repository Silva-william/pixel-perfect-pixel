import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { currentUser } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — StudyAI" },
      { name: "description", content: "Ajuste seu perfil, aparência e preferências de estudo." },
      { property: "og:title", content: "Configurações — StudyAI" },
      {
        property: "og:description",
        content: "Ajuste seu perfil, aparência e preferências de estudo.",
      },
    ],
  }),
  component: SettingsPage,
});

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-soft space-y-5 p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [goal, setGoal] = useState([currentUser.dailyGoalMinutes]);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("pt-BR");

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Ajuste sua experiência de estudo."
        action={<Button onClick={() => toast.success("Preferências salvas.")}>Salvar</Button>}
      />

      <Section title="Perfil">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="Aparência">
        <div className="flex flex-wrap gap-2">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={theme === option.value}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors",
                theme === option.value
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-surface",
              )}
            >
              <option.icon className="size-4" />
              {option.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Preferências de estudo">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Tempo diário desejado</Label>
            <span className="text-sm text-muted-foreground">{goal[0]} min</span>
          </div>
          <Slider value={goal} onValueChange={setGoal} min={10} max={180} step={5} />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <div>
            <Label htmlFor="notifications">Notificações</Label>
            <p className="text-xs text-muted-foreground">Lembretes diários de revisão.</p>
          </div>
          <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <Label htmlFor="language">Idioma</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português (BR)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>
    </>
  );
}
