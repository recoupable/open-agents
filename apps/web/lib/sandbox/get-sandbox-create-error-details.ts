import { SandboxCreateRequestError } from "./sandbox-create-request-error";

export type SandboxCreateErrorDetails = {
  message: string;
  actionUrl?: string;
};

export function getSandboxCreateErrorDetails(
  error: unknown,
): SandboxCreateErrorDetails {
  if (error instanceof SandboxCreateRequestError) {
    return {
      message: error.message,
      actionUrl: error.actionUrl,
    };
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return { message: error.message };
  }

  return { message: "Failed to create sandbox. Please try again." };
}
