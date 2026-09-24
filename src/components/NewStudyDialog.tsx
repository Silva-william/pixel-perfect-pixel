import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { subjectColorOptions, subjectSwatch } from "@/lib/subject-colors";
import { useStudies } from "@/lib/studies-store";
import { cn } from "@/lib/utils";
import type { SubjectColor } from "@/data/types";

export function NewStudyDialog({ trigger }: { trigger: ReactNode }) {
  const { createSubject } = useStudies();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<SubjectColor>("green");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Dê um nome para a matéria.");
      return;
    }
    createSubject({ name: name.trim(), description: description.trim(), color });
    toast.success("Estudo criado com sucesso.");
    setName("");
    setDescription("");
    setColor("green");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo estudo</DialogTitle>
          <DialogDescription>
            Crie uma matéria para organizar seus materiais e revisões.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="study-name">Nome da matéria</Label>
            <Input
              id="study-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Geografia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="study-description">Descrição</Label>
            <Textarea
              id="study-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que você quer estudar nesta matéria?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor da matéria</Label>
            <div className="flex flex-wrap gap-2">
              {subjectColorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={color === option.value}
                  onClick={() => setColor(option.value)}
                  className={cn(
                    "size-8 rounded-full border-2 transition-transform",
                    subjectSwatch[option.value],
                    color === option.value
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-105",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Criar estudo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
