import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";

const MANIFESTS = [
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "setup.py",
  "Gemfile",
  "pom.xml",
  "README.md",
];

const ENTRY_POINTS = [
  "src/index.ts",
  "src/index.js",
  "src/main.ts",
  "src/main.py",
  "src/main.go",
  "src/main.rs",
  "main.py",
  "main.go",
  "main.rs",
  "index.js",
  "index.ts",
];

const SOURCE_EXTENSIONS = new Set([".py", ".ts", ".js", ".go", ".rs", ".rb", ".java", ".c", ".cpp", ".sh"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "vendor", "target", ".venv"]);
const MAX_FILE_BYTES = 200_000;

export interface SourceFile {
  path: string;
  content: string;
}

/** Strip HTML comments and zero-width characters before content reaches an LLM. */
export function sanitize(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "").replace(/[\u200b\u200c\u200d\ufeff]/g, "");
}

export function firstLines(text: string, maxLines: number): string {
  return text.split(/\r?\n/).slice(0, maxLines).join("\n");
}

async function readSourceFile(root: string, path: string, maxLines: number): Promise<SourceFile | undefined> {
  try {
    const info = await stat(join(root, path));
    if (!info.isFile() || info.size > MAX_FILE_BYTES) return undefined;
    const text = await readFile(join(root, path), "utf8");
    if (text.includes("\u0000")) return undefined; // binary
    return { path, content: firstLines(sanitize(text), maxLines) };
  } catch {
    return undefined;
  }
}

async function walk(root: string, dir: string, depth: number, found: string[]): Promise<void> {
  if (depth > 2) return;

  let entries;
  try {
    entries = await readdir(join(root, dir), { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await walk(root, path, depth + 1, found);
    else if (SOURCE_EXTENSIONS.has(extname(entry.name))) found.push(path);
  }
}

async function sizeOf(root: string, path: string): Promise<number> {
  try {
    return (await stat(join(root, path))).size;
  } catch {
    return 0;
  }
}

/** Pick the manifest, entry point, and largest source files, up to `maxFiles`. */
export async function selectSourceFiles(
  root: string,
  maxFiles: number,
  maxLines: number,
): Promise<SourceFile[]> {
  const preferred: string[] = [];
  for (const manifest of MANIFESTS) {
    if (await sizeOf(root, manifest)) preferred.push(manifest);
  }
  for (const entry of ENTRY_POINTS) {
    if (await sizeOf(root, entry)) {
      preferred.push(entry);
      break;
    }
  }

  const discovered: string[] = [];
  await walk(root, "", 0, discovered);
  const bySize = await Promise.all(discovered.map(async (path) => ({ path, size: await sizeOf(root, path) })));
  bySize.sort((a, b) => b.size - a.size);

  const chosen = [...new Set([...preferred, ...bySize.map((entry) => entry.path)])].slice(0, maxFiles);
  const files: SourceFile[] = [];
  for (const path of chosen) {
    const file = await readSourceFile(root, path, maxLines);
    if (file) files.push(file);
  }
  return files;
}
