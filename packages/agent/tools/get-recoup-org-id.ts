import { isAgentContext } from "./utils";

/**
 * Read the Recoupable organization UUID from agent context.
 * Set when the sandbox was opened against a recoupable/org-* repo;
 * undefined for non-org sandboxes or contexts that didn't forward it.
 */
export function getRecoupOrgId(
  experimental_context: unknown,
): string | undefined {
  const context = isAgentContext(experimental_context)
    ? experimental_context
    : undefined;
  return context?.recoupOrgId;
}
