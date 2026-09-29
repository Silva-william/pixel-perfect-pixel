import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";

type Thread = { id: string; title: string; updated_at: string };

export function TutorThreads({ subjectId }: { subjectId: string }) {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[] | null>(null);

  useEffect(() => {
    supabase
      .from("tutor_threads")
      .select("id, title, updated_at")
      .eq("subject_id", subjectId)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setThreads(data ?? []));
  }, [subjectId]);

  const create = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from("tutor_threads")
      .insert({ user_id: u.user.id, subject_id: subjectId })
      .select("id")
      .single();
    if (error) {
      toast.error("Não foi possível criar a conversa.");
      return;
    }
    navigate({ to: "/tutor/$threadId", params: { threadId: data.id } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Tutor IA</h3>
          <p className="text-xs text-muted-foreground">Responde apenas com base nos materiais desta matéria.</p>
        </div>
        <Button size="sm" onClick={create}>
          <Plus className="size-4" /> Nova conversa
        </Button>
      </div>
      {threads === null ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : threads.length ? (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.id}
              to="/tutor/$threadId"
              params={{ threadId: t.id }}
              className="card-soft flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
            >
              <MessageCircle className="size-4 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{t.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(t.updated_at).toLocaleDateString("pt-BR")}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<MessageCircle className="size-5" />}
          title="Nenhuma conversa ainda"
          description="Tire dúvidas sobre os seus materiais com o Tutor IA."
          action={
            <Button onClick={create}>
              <Plus className="size-4" /> Nova conversa
            </Button>
          }
        />
      )}
    </div>
  );
}
