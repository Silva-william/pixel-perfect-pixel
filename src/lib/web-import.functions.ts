import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const importLinkMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.union([
    z.object({ subjectId: z.string().uuid(), url: z.string().trim().url().max(2048) }),
    z.object({ materialId: z.string().uuid() }),
  ]).parse(data))
  .handler(async ({ data, context }) => {
    const { importWebMaterial } = await import("./web-import.server");
    return importWebMaterial(context.supabase, context.userId, data);
  });