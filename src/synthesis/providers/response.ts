/** Pull a human-readable message out of a provider's error body. */
export function errorMessage(text: string, status: number): string {
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof parsed.error === "string") return parsed.error;
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
  } catch {
    // Not JSON — fall through to the raw body.
  }
  const trimmed = text.trim().slice(0, 300);
  return trimmed || `HTTP ${status}`;
}
