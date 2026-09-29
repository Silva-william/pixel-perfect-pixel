import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Body = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().regex(/^[A-Za-z]+$/).default("Kore"),
});

async function handle(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });
  const supabase = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: claims } = await supabase.auth.getClaims(token);
  if (!claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-tts-preview",
      contents: [{ role: "user", parts: [{ text: `Leia em português do Brasil, em tom calmo e claro: ${parsed.data.text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: parsed.data.voice } } },
      },
      stream_format: "audio",
    }),
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/wav",
      "Cache-Control": "no-cache",
    },
  });
}

export const Route = createFileRoute("/api/tts")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
