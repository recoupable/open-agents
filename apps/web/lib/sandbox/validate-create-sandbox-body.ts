import { z } from "zod";

const createSandboxBodySchema = z.object({
  repoUrl: z.string().optional(),
  branch: z.string().optional(),
  isNewBranch: z.boolean().optional(),
  sessionId: z.string().optional(),
  sandboxType: z.literal("vercel").optional(),
  orgSlug: z.string().optional(),
});

export type CreateSandboxBody = z.infer<typeof createSandboxBodySchema>;

type ValidationResult =
  | { ok: true; data: CreateSandboxBody }
  | { ok: false; response: Response };

export function validateCreateSandboxBody(body: unknown): ValidationResult {
  const result = createSandboxBodySchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid request body";
    return {
      ok: false,
      response: Response.json({ error: message }, { status: 400 }),
    };
  }
  return { ok: true, data: result.data };
}
