import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import type { Candidate, ProgressHandler, ProviderId, QueryPlan } from "./types.js";
import type { Config } from "./config.js";
import type { SourceAdapter } from "./adapters/index.js";
import type { AdapterError } from "./retrieval/fanout.js";
import { retrieve, type Retrieval } from "./retrieval/retrieve.js";
import { planQueries } from "./retrieval/query-plan.js";
import {
  buildPrompt,
  synthesize,
  SYNTHESIS_SYSTEM,
  type SynthesisResult,
} from "./synthesis/synthesize.js";
import { SynthesisSchema } from "./synthesis/schema.js";
import {
  buildExplorationPrompt,
  synthesizeExploration,
  EXPLORATION_SYSTEM,
  type ExplorationSynthesis,
} from "./synthesis/explore.js";
import { ExplorationSchema } from "./synthesis/explore-schema.js";
import { DeepJudgeSchema } from "./synthesis/deep-schema.js";
import {
  buildDeepPrompt,
  deepTargets,
  DEEP_SYSTEM,
  type DeepInspection,
  type DeepOptions,
} from "./deep/inspect.js";
import { checkCitations } from "./deep/cites.js";
import { cleanupClone, gitCloner } from "./deep/clone.js";
import { selectSourceFiles } from "./deep/files.js";
import { buildValidationReport, type DeepInspections } from "./validate.js";
import { buildExplorationReport, type DeepEvidence } from "./explore.js";
import { toJsonSchema, validateStructured } from "./synthesis/providers/structured.js";
import { ProviderError } from "./errors.js";
import type { LLMClient, StructuredRequest } from "./synthesis/providers/types.js";

export type SessionMode = "validate" | "explore";

/** One unit of reasoning the invoking agent must supply. */
export interface SessionRequest {
  key: string;
  /** Filename under `requests/` and `responses/`. */
  file: string;
  schemaName: string;
  system: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
}

export interface SessionState {
  version: 1;
  idea: string;
  mode: SessionMode;
  deep: boolean;
  retrieval: Retrieval;
  requests: SessionRequest[];
  /** Deep mode only: candidate id -> clone root, kept for citation checks. */
  clones?: Record<string, string>;
  createdAt: string;
}

function makeRequest(
  key: string,
  schemaName: string,
  system: string,
  prompt: string,
  schema: z.ZodType,
): SessionRequest {
  return {
    key,
    file: `${key.replace(/[^a-zA-Z0-9._-]+/g, "_")}.json`,
    schemaName,
    system,
    prompt,
    jsonSchema: toJsonSchema(schema),
  };
}

export interface PrepareOptions {
  idea: string;
  config: Config;
  mode?: SessionMode;
  /** Enables deep mode: clone the top candidates and emit inspection requests. */
  deep?: DeepOptions;
  /** A hand-written query plan; falls back to the heuristic planner. */
  plan?: QueryPlan;
  adapters?: SourceAdapter[];
  onProgress?: ProgressHandler;
  signal?: AbortSignal;
}

/**
 * Run every deterministic stage (plan, search, rank, verify, clone) and emit
 * the reasoning the invoking agent must perform. No LLM is contacted.
 */
export async function prepare(options: PrepareOptions): Promise<SessionState> {
  const mode = options.mode ?? "validate";
  const plan = options.plan ?? planQueries(options.idea);
  const retrieval = await retrieve({
    idea: options.idea,
    config: options.config,
    plan,
    adapters: options.adapters,
    onProgress: options.onProgress,
    signal: options.signal,
  });

  const requests: SessionRequest[] = [];
  if (retrieval.candidates.length > 0) {
    requests.push(
      mode === "validate"
        ? makeRequest(
            "synthesis",
            "prior_art_analysis",
            SYNTHESIS_SYSTEM,
            buildPrompt(options.idea, plan, retrieval.candidates),
            SynthesisSchema,
          )
        : makeRequest(
            "exploration",
            "exploration",
            EXPLORATION_SYSTEM,
            buildExplorationPrompt(options.idea, plan, retrieval.candidates),
            ExplorationSchema,
          ),
    );
  }

  const clones = options.deep ? await prepareDeep(options, retrieval, plan, requests) : undefined;

  return {
    version: 1,
    idea: options.idea,
    mode,
    deep: Boolean(options.deep),
    retrieval,
    requests,
    ...(clones ? { clones } : {}),
    createdAt: new Date().toISOString(),
  };
}

async function prepareDeep(
  options: PrepareOptions,
  retrieval: Retrieval,
  plan: QueryPlan,
  requests: SessionRequest[],
): Promise<Record<string, string>> {
  const config = options.config;
  const deep = options.deep ?? {};
  const cloner = deep.cloner ?? gitCloner;
  const limit = deep.candidates ?? config.deepCandidates;
  const maxFiles = deep.maxFiles ?? config.deepMaxFiles;
  const maxFileLines = deep.maxFileLines ?? config.deepMaxFileLines;
  const timeoutMs = deep.timeoutMs ?? config.cloneTimeoutMs;

  const clones: Record<string, string> = {};
  for (const candidate of deepTargets(retrieval.candidates, limit)) {
    try {
      const root = await cloner.clone(candidate.url, { timeoutMs });
      const files = await selectSourceFiles(root, maxFiles, maxFileLines);
      clones[candidate.id] = root;
      requests.push(
        makeRequest(
          `deep/${candidate.id}`,
          "deep_judgement",
          DEEP_SYSTEM,
          buildDeepPrompt(candidate, plan, files),
          DeepJudgeSchema,
        ),
      );
      options.onProgress?.({ type: "inspect", candidateId: candidate.id, ok: true });
    } catch (error) {
      options.onProgress?.({
        type: "inspect",
        candidateId: candidate.id,
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return clones;
}

/** An LLM client that returns responses the invoking agent already produced. */
class ResponseClient implements LLMClient {
  readonly provider: ProviderId = "host";
  readonly model = "delegated";

  constructor(
    private readonly responses: Record<string, unknown>,
    private readonly keysBySchema: Record<string, string>,
  ) {}

  async completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    const key = this.keysBySchema[request.schemaName];
    const value = key === undefined ? undefined : this.responses[key];
    if (value === undefined) {
      throw new ProviderError(`no response supplied for "${request.schemaName}"`, this.provider);
    }
    return validateStructured(request.schema, value, this.provider);
  }
}

export interface FinishOptions {
  state: SessionState;
  /** Agent responses keyed by `SessionRequest.key`. */
  responses: Record<string, unknown>;
  onProgress?: ProgressHandler;
  /** Remove cloned repositories afterwards. Defaults to true. */
  cleanup?: boolean;
}

export interface FinishResult {
  report: ReturnType<typeof buildValidationReport> | ReturnType<typeof buildExplorationReport>;
  errors: AdapterError[];
  dropped: Candidate[];
  unverified: Candidate[];
}

/** Assemble, verify, and derive the verdict from the agent's responses. */
export async function finish(options: FinishOptions): Promise<FinishResult> {
  const { state, responses } = options;
  const llm = new ResponseClient(responses, {
    prior_art_analysis: "synthesis",
    exploration: "exploration",
  });

  const inspections = await collectInspections(state, responses);
  const deep: DeepInspections | undefined = state.deep ? inspections : undefined;

  let report: FinishResult["report"];
  if (state.mode === "validate") {
    const synthesis: SynthesisResult = await synthesize(
      state.idea,
      state.retrieval.plan,
      state.retrieval.candidates,
      llm,
    );
    report = buildValidationReport({
      idea: state.idea,
      retrieval: state.retrieval,
      synthesis,
      ...(deep ? { deep } : {}),
    });
  } else {
    const evidence = new Map(inspections.inspections.map((entry) => [entry.candidateId, entry.evidence]));
    const synthesis: ExplorationSynthesis = await synthesizeExploration(
      state.idea,
      state.retrieval.plan,
      state.retrieval.candidates,
      llm,
      deep ? evidence : undefined,
    );
    const deepEvidence: DeepEvidence | undefined = deep
      ? { evidence, attempted: deep.attempted, succeeded: deep.succeeded }
      : undefined;
    report = buildExplorationReport({
      topic: state.idea,
      retrieval: state.retrieval,
      synthesis,
      ...(deepEvidence ? { deep: deepEvidence } : {}),
    });
  }

  if (options.cleanup !== false) await cleanupSession(state);

  return {
    report,
    errors: state.retrieval.errors,
    dropped: state.retrieval.dropped,
    unverified: state.retrieval.unverified,
  };
}

/** Validate each deep response's cites against its retained clone. */
async function collectInspections(
  state: SessionState,
  responses: Record<string, unknown>,
): Promise<DeepInspections> {
  const inspections: DeepInspection[] = [];
  let attempted = 0;
  let succeeded = 0;

  for (const request of state.requests) {
    if (!request.key.startsWith("deep/")) continue;
    attempted += 1;
    const candidateId = request.key.slice("deep/".length);
    const output = responses[request.key];
    const root = state.clones?.[candidateId];
    if (output === undefined || root === undefined) continue;

    const parsed = validateStructured(DeepJudgeSchema, output, "host");
    const { valid } = await checkCitations(root, parsed.evidence);
    inspections.push({
      candidateId,
      axisScores: parsed.axisScores,
      rationale: parsed.rationale,
      evidence: valid,
    });
    succeeded += 1;
  }

  return { inspections, attempted, succeeded };
}

const SESSION_FILE = "session.json";

export async function writeSession(dir: string, state: SessionState): Promise<void> {
  await mkdir(join(dir, "requests"), { recursive: true });
  await mkdir(join(dir, "responses"), { recursive: true });
  await writeFile(join(dir, SESSION_FILE), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  for (const request of state.requests) {
    await writeFile(join(dir, "requests", request.file), `${JSON.stringify(request, null, 2)}\n`, "utf8");
  }
}

export async function readSession(dir: string): Promise<SessionState> {
  return JSON.parse(await readFile(join(dir, SESSION_FILE), "utf8")) as SessionState;
}

export async function readResponses(
  dir: string,
  state: SessionState,
): Promise<Record<string, unknown>> {
  const responses: Record<string, unknown> = {};
  for (const request of state.requests) {
    let text: string;
    try {
      text = await readFile(join(dir, "responses", request.file), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    responses[request.key] = JSON.parse(text);
  }
  return responses;
}

export async function cleanupSession(state: SessionState): Promise<void> {
  if (!state.clones) return;
  await Promise.all(Object.values(state.clones).map((root) => cleanupClone(root)));
}
