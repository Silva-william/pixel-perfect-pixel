import { useEffect, useRef, useState } from "react";
import { CloudCheck, Headphones, Loader2, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const SPEEDS = [1, 1.25, 1.5, 2];
const VOICE = "Kore";
const BUCKET = "materials";

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

async function shortHash(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function synthesize(text: string, signal: AbortSignal): Promise<Blob> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/tts", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ text, voice: VOICE }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    if (res.status === 402) throw new Error("Seus créditos de IA acabaram.");
    if (res.status === 429) throw new Error("Muitas solicitações. Tente em instantes.");
    throw new Error(msg.slice(0, 200) || `Erro ${res.status}`);
  }
  return res.blob();
}

export type ListenPosition = { chunk: number; seconds: number };

/**
 * Reads a page aloud. Generated audio is saved in the user's storage
 * (<userId>/audio/<materialId>/p<page>-c<chunk>-<hash>) so replays are instant,
 * and the listening position is reported so it can resume later.
 */
export function AudioPlayer({
  text,
  materialId,
  page,
  resume,
  autoPlay,
  onProgress,
  onStart,
  onFinished,
}: {
  text: string;
  materialId: string;
  page: number;
  /** Where to resume on this page. */
  resume?: ListenPosition | null;
  autoPlay?: boolean;
  onProgress?: (pos: ListenPosition) => void;
  onStart?: () => void;
  /** Called when the whole page has been read. */
  onFinished?: () => void;
}) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const folder = `${userId}/audio/${materialId}`;

  const audioRef = useRef<HTMLAudioElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlsRef = useRef<Map<number, Promise<string>>>(new Map());
  const savedRef = useRef<Set<string>>(new Set());
  const chunks = useRef<string[]>([]);
  const seekRef = useRef(0);
  const lastSaveRef = useRef(0);
  const stateRef = useRef<"idle" | "loading" | "playing" | "paused">("idle");
  const chunkRef = useRef(0);
  const cbRef = useRef({ onProgress, onStart, onFinished });
  cbRef.current = { onProgress, onStart, onFinished };

  const [state, _setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [chunk, _setChunk] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [savedCount, setSavedCount] = useState(0);
  const [hasResume, setHasResume] = useState(false);

  const setState = (s: typeof state) => {
    stateRef.current = s;
    _setState(s);
  };
  const setChunk = (i: number) => {
    chunkRef.current = i;
    _setChunk(i);
  };

  const report = () => {
    const a = audioRef.current;
    cbRef.current.onProgress?.({ chunk: chunkRef.current, seconds: a ? Math.floor(a.currentTime) : 0 });
  };

  const fileName = async (i: number) => `p${page}-c${i}-${await shortHash(`${VOICE}|${chunks.current[i]}`)}`;

  // New page/text: load cached audio list, set resume point, stop previous playback.
  useEffect(() => {
    chunks.current = chunkText(text);
    const start = resume && resume.chunk < chunks.current.length ? resume : null;
    setChunk(start?.chunk ?? 0);
    seekRef.current = start?.seconds ?? 0;
    setHasResume(!!start && (start.chunk > 0 || start.seconds > 0));
    savedRef.current = new Set();
    setSavedCount(0);

    let cancelled = false;
    if (userId) {
      void supabase.storage
        .from(BUCKET)
        .list(folder, { search: `p${page}-c`, limit: 1000 })
        .then(async ({ data }) => {
          if (cancelled) return;
          const names = new Set((data ?? []).map((f) => f.name));
          const expected = await Promise.all(chunks.current.map((_, i) => fileName(i)));
          if (cancelled) return;
          savedRef.current = new Set(expected.filter((n) => names.has(n)));
          setSavedCount(savedRef.current.size);
          if (autoPlay) void playChunk(chunkRef.current);
        });
    }

    return () => {
      cancelled = true;
      if (stateRef.current === "playing" || stateRef.current === "paused") report();
      abortRef.current?.abort();
      abortRef.current = null;
      urlsRef.current.forEach((p) => p.then(URL.revokeObjectURL).catch(() => {}));
      urlsRef.current.clear();
      audioRef.current?.pause();
      stateRef.current = "idle";
      _setState("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, userId]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const loadChunk = async (i: number, signal: AbortSignal): Promise<string> => {
    const name = await fileName(i);
    const path = `${folder}/${name}`;
    if (savedRef.current.has(name)) {
      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (!error && data) return URL.createObjectURL(data);
    }
    const blob = await synthesize(chunks.current[i]!, signal);
    void supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: blob.type || "audio/wav" })
      .then(({ error }) => {
        if (!error || /exists|Duplicate/i.test(error.message)) {
          savedRef.current.add(name);
          setSavedCount(savedRef.current.size);
        }
      });
    return URL.createObjectURL(blob);
  };

  const getUrl = (i: number) => {
    if (!abortRef.current) abortRef.current = new AbortController();
    let p = urlsRef.current.get(i);
    if (!p) {
      p = loadChunk(i, abortRef.current.signal);
      urlsRef.current.set(i, p);
    }
    return p;
  };

  const playChunk = async (i: number) => {
    if (i >= chunks.current.length) {
      setState("idle");
      setChunk(0);
      setHasResume(false);
      cbRef.current.onFinished?.();
      return;
    }
    setChunk(i);
    setState("loading");
    try {
      const url = await getUrl(i);
      if (i + 1 < chunks.current.length) void getUrl(i + 1).catch(() => {});
      const a = audioRef.current!;
      const seek = seekRef.current;
      seekRef.current = 0;
      a.src = url;
      a.playbackRate = speed;
      a.onloadedmetadata = () => {
        if (seek > 0 && seek < a.duration) a.currentTime = seek;
      };
      a.ontimeupdate = () => {
        if (Date.now() - lastSaveRef.current > 5000) {
          lastSaveRef.current = Date.now();
          report();
        }
      };
      a.onended = () => void playChunk(i + 1);
      await a.play();
      setState("playing");
      setHasResume(false);
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
      report();
    } else if (state === "paused") {
      void a.play();
      setState("playing");
    } else if (state === "idle") {
      cbRef.current.onStart?.();
      void playChunk(chunk);
    }
  };

  const stop = () => {
    const a = audioRef.current!;
    report();
    seekRef.current = Math.floor(a.currentTime);
    a.pause();
    setState("idle");
    setHasResume(true);
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
        ) : state === "paused" || hasResume ? (
          <Play className="size-4" />
        ) : (
          <Headphones className="size-4" />
        )}
        {state === "loading"
          ? savedRef.current.size > chunk
            ? "Carregando..."
            : "Gerando áudio..."
          : state === "playing"
            ? "Pausar"
            : state === "paused" || hasResume
              ? "Continuar ouvindo"
              : "Ouvir página"}
      </Button>
      {state === "playing" || state === "paused" ? (
        <Button size="sm" variant="ghost" onClick={stop} aria-label="Parar">
          <Square className="size-4" />
        </Button>
      ) : null}
      {state !== "idle" || hasResume ? (
        <span className="text-xs text-muted-foreground">
          Trecho {chunk + 1} de {total}
        </span>
      ) : null}
      {savedCount > 0 ? (
        <span
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          title="Áudio guardado na sua conta: tocar de novo não gera outra vez"
        >
          <CloudCheck className="size-3.5 text-primary" />
          {savedCount === total ? "Áudio salvo" : `${savedCount} de ${total} trechos salvos`}
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
