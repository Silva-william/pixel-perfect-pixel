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
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
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
  const { profile, session, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState([45]);
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setGoal([profile.daily_goal_minutes]);
    }
    setEmail(session?.user.email ?? "");
  }, [profile, session]);
  const save = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), daily_goal_minutes: goal[0] ?? 45 })
      .eq("id", profile.id);
    if (error) return toast.error("Não foi possível salvar.");
    await refreshProfile();
    toast.success("Preferências salvas.");
  };
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("pt-BR");

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Ajuste sua experiência de estudo."
        action={<Button onClick={save}>Salvar</Button>}
      />

      <Section title="Perfil">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} readOnly disabled />
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
