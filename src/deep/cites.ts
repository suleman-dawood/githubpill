import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import type { EvidenceCite } from "../types.js";

export interface CiteCheck {
  valid: EvidenceCite[];
  invalid: EvidenceCite[];
}

/** Reject absolute paths and traversal before touching the filesystem. */
function isSafePath(path: string): boolean {
  return Boolean(path) && !path.startsWith("/") && !path.includes("..");
}

/** Keep only cites that point at a real line of a real file inside the clone. */
export async function checkCitations(
  root: string,
  cites: readonly EvidenceCite[],
): Promise<CiteCheck> {
  const valid: EvidenceCite[] = [];
  const invalid: EvidenceCite[] = [];

  for (const cite of cites) {
    if (!isSafePath(cite.path)) {
      invalid.push(cite);
      continue;
    }
    try {
      const text = await readFile(join(root, normalize(cite.path)), "utf8");
      const lineCount = text.split(/\r?\n/).length;
      if (cite.line >= 1 && cite.line <= lineCount) valid.push(cite);
      else invalid.push(cite);
    } catch {
      invalid.push(cite);
    }
  }

  return { valid, invalid };
}
