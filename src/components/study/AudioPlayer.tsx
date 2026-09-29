import { useEffect, useRef, useState } from "react";
import { Headphones, Loader2, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SPEEDS = [1, 1.25, 1.5, 2];

/** Splits text into chunks at sentence boundaries (max ~1500 chars). */
function chunkText(text: string, max = 1500): string[] {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*\s*/g) ?? [];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    for (let i = 0; i < s.length; i += max) {
      const piece = s.slice(i, i + max);
      if ((cur + piece).length > max && cur) {
        out.push(cur.trim());
        cur = "";
      }
      cur += piece;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function synthesize(text: string, signal: AbortSignal): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/tts", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    if (res.status === 402) throw new Error("Seus créditos de IA acabaram.");
    if (res.status === 429) throw new Error("Muitas solicitações. Tente em instantes.");
    throw new Error(msg.slice(0, 200) || `Erro ${res.status}`);
  }
  return URL.createObjectURL(await res.blob());
}

export function AudioPlayer({
  text,
  onFinished,
}: {
  text: string;
  /** Called when the whole text has been read. Return true to keep playing (next page). */
  onFinished?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlsRef = useRef<Map<number, Promise<string>>>(new Map());
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [chunk, setChunk] = useState(0);
  const [speed, setSpeed] = useState(1);
  const chunks = useRef<string[]>([]);

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    urlsRef.current.forEach((p) => p.then(URL.revokeObjectURL).catch(() => {}));
    urlsRef.current.clear();
    audioRef.current?.pause();
    setState("idle");
    setChunk(0);
  };

  // New page/text: stop and drop cached audio.
  useEffect(() => {
    chunks.current = chunkText(text);
    return reset;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const getUrl = (i: number) => {
    if (!abortRef.current) abortRef.current = new AbortController();
    let p = urlsRef.current.get(i);
    if (!p) {
      p = synthesize(chunks.current[i]!, abortRef.current.signal);
      urlsRef.current.set(i, p);
    }
    return p;
  };

  const playChunk = async (i: number) => {
    if (i >= chunks.current.length) {
      setState("idle");
      setChunk(0);
      onFinished?.();
      return;
    }
    setChunk(i);
    setState("loading");
    try {
      const url = await getUrl(i);
      if (i + 1 < chunks.current.length) void getUrl(i + 1).catch(() => {});
      const a = audioRef.current!;
      a.src = url;
      a.playbackRate = speed;
      a.onended = () => void playChunk(i + 1);
      await a.play();
      setState("playing");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      urlsRef.current.delete(i);
      setState("idle");
      toast.error("Não foi possível gerar o áudio.", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const toggle = () => {
    const a = audioRef.current!;
    if (state === "playing") {
      a.pause();
      setState("paused");
    } else if (state === "paused") {
      void a.play();
      setState("playing");
    } else if (state === "idle") {
      void playChunk(chunk);
    }
  };

  if (!text.trim()) return null;
  const total = chunks.current.length || 1;

  return (
    <div className="card-soft flex flex-wrap items-center gap-3 p-3">
      <audio ref={audioRef} className="hidden" />
      <Button size="sm" onClick={toggle} disabled={state === "loading"}>
        {state === "loading" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : state === "playing" ? (
          <Pause className="size-4" />
        ) : state === "paused" ? (
          <Play className="size-4" />
        ) : (
          <Headphones className="size-4" />
        )}
        {state === "loading"
          ? "Gerando áudio..."
          : state === "playing"
            ? "Pausar"
            : state === "paused"
              ? "Continuar"
              : "Ouvir página"}
      </Button>
      {state !== "idle" ? (
        <Button size="sm" variant="ghost" onClick={reset} aria-label="Parar">
          <Square className="size-4" />
        </Button>
      ) : null}
      {state !== "idle" ? (
        <span className="text-xs text-muted-foreground">
          Trecho {chunk + 1} de {total}
        </span>
      ) : null}
      <div className="ml-auto flex items-center gap-1" role="group" aria-label="Velocidade">
        {SPEEDS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === speed ? "secondary" : "ghost"}
            className="h-7 px-2 text-xs"
            onClick={() => setSpeed(s)}
          >
            {s}x
          </Button>
        ))}
      </div>
    </div>
  );
}
