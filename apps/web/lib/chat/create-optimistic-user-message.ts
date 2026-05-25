import { generateId, type FileUIPart } from "ai";
import type { WebAgentUIMessage } from "@/app/types";

type SendMessageArg = Parameters<
  (
    message?:
      | { text: string; files?: FileList | FileUIPart[] }
      | { files: FileList | FileUIPart[] }
      | Omit<WebAgentUIMessage, "id">,
  ) => Promise<void>
>[0];

async function filePartsFromSendArg(
  files: FileList | FileUIPart[] | undefined,
): Promise<FileUIPart[]> {
  if (!files) {
    return [];
  }
  if (Array.isArray(files)) {
    return files;
  }

  const parts: FileUIPart[] = [];
  for (const file of files) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    parts.push({
      type: "file",
      mediaType: file.type,
      filename: file.name,
      url: dataUrl,
    });
  }
  return parts;
}

/**
 * Build a user message for optimistic UI when the real send is queued
 * behind an in-flight response (no network call yet).
 */
export async function createOptimisticUserMessage(
  message: NonNullable<SendMessageArg>,
): Promise<WebAgentUIMessage> {
  if ("text" in message || "files" in message) {
    const fileParts = await filePartsFromSendArg(
      "files" in message ? message.files : undefined,
    );
    const textParts =
      "text" in message && message.text != null
        ? [{ type: "text" as const, text: message.text }]
        : [];

    return {
      id: generateId(),
      role: "user",
      parts: [...fileParts, ...textParts],
      metadata: "metadata" in message ? message.metadata : undefined,
    };
  }

  return {
    ...message,
    id: message.id ?? generateId(),
    role: message.role ?? "user",
  } as WebAgentUIMessage;
}
