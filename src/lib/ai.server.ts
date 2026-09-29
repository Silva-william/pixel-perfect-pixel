import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch } from "./ai-run-id.server";

export const AI_MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export function createGatewayModel(runId?: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("A IA não está configurada.");
  const runIdFetch = createLovableAiGatewayRunIdFetch(runId);
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return { model: provider.responses(AI_MODEL), runIdFetch };
}

export const aiProviderOptions = {
  openai: {
    store: false,
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    include: ["reasoning.encrypted_content"],
  },
};

/** Streams a one-shot call and returns the final text. */
export async function generateTextStreamed(system: string, messages: ModelMessage[]) {
  const { model } = createGatewayModel();
  const result = streamText({ model, system, messages, providerOptions: aiProviderOptions, maxRetries: 1 });
  return await result.text;
}

const MAX_CONTEXT = 60000;

/** Concatenates the extracted text of a subject's materials (RLS-scoped client). */
export async function loadSubjectContext(supabase: SupabaseClient<Database>, subjectId: string) {
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("id", subjectId)
    .maybeSingle();
  if (!subject) throw new Error("Matéria não encontrada.");
  const { data: materials } = await supabase
    .from("materials")
    .select("id, name")
    .eq("subject_id", subjectId)
    .in("status", ["ready"]);
  let text = "";
  for (const m of materials ?? []) {
    if (text.length >= MAX_CONTEXT) break;
    const { data: pages } = await supabase
      .from("material_pages")
      .select("page_number, content")
      .eq("material_id", m.id)
      .order("page_number")
      .limit(1000);
    text += `\n\n### Material: ${m.name}\n`;
    for (const p of pages ?? []) {
      if (text.length >= MAX_CONTEXT) break;
      text += `\n[página ${p.page_number}]\n${p.content}`;
    }
  }
  return { subject, text: text.slice(0, MAX_CONTEXT).trim() };
}

export function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.search(/[[{]/);
  return JSON.parse(start > 0 ? cleaned.slice(start) : cleaned) as T;
}
