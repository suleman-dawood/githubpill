import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";
import { ConfigError } from "./errors.js";

const noGh = { ghToken: () => undefined };

describe("loadConfig", () => {
  it("auto-detects the provider from available keys", () => {
    const config = loadConfig({ OPENAI_API_KEY: "k" }, noGh);
    expect(config.llm.provider).toBe("openai");
    expect(config.llm.model).toBe("gpt-4o");
  });

  it("prefers anthropic when several keys are present", () => {
    const config = loadConfig({ OPENAI_API_KEY: "k", ANTHROPIC_API_KEY: "a" }, noGh);
    expect(config.llm.provider).toBe("anthropic");
  });

  it("honours an explicit provider", () => {
    const config = loadConfig({ GITHUBPILL_PROVIDER: "gemini", GEMINI_API_KEY: "g" }, noGh);
    expect(config.llm.provider).toBe("gemini");
    expect(config.llm.model).toBe("gemini-2.0-flash");
  });

  it("supports DeepSeek with its own key and default model", () => {
    const config = loadConfig({ DEEPSEEK_API_KEY: "d" }, noGh);
    expect(config.llm.provider).toBe("deepseek");
    expect(config.llm.model).toBe("deepseek-chat");
  });

  it("accepts GOOGLE_API_KEY as the Gemini key", () => {
    expect(loadConfig({ GEMINI_API_KEY: "g" }, noGh).llm.provider).toBe("gemini");
    expect(loadConfig({ GOOGLE_API_KEY: "g" }, noGh).llm.provider).toBe("gemini");
  });

  it("rejects an unknown provider", () => {
    expect(() => loadConfig({ GITHUBPILL_PROVIDER: "nope", OPENAI_API_KEY: "k" }, noGh)).toThrow(
      ConfigError,
    );
  });

  it("falls back to the host provider when no key is present", () => {
    expect(loadConfig({}, noGh).llm.provider).toBe("host");
  });

  it("accepts an explicit host provider without a key", () => {
    expect(loadConfig({ GITHUBPILL_PROVIDER: "host" }, noGh).llm.provider).toBe("host");
  });

  it("reads GITHUBPILL_AGENT for the host provider", () => {
    const config = loadConfig({ GITHUBPILL_PROVIDER: "host", GITHUBPILL_AGENT: "opencode" }, noGh);
    expect(config.llm.agent).toBe("opencode");
  });

  it("gives the host provider a longer default LLM timeout", () => {
    const host = loadConfig({ GITHUBPILL_PROVIDER: "host" }, noGh);
    const openai = loadConfig({ OPENAI_API_KEY: "k" }, noGh);
    expect(host.llm.timeoutMs).toBeGreaterThan(openai.llm.timeoutMs);
    expect(loadConfig({ GITHUBPILL_PROVIDER: "host", GITHUBPILL_LLM_TIMEOUT_MS: "5000" }, noGh).llm.timeoutMs).toBe(5000);
  });

  it("generates queries with the LLM by default, unless disabled", () => {
    expect(loadConfig({ OPENAI_API_KEY: "k" }, noGh).llmQueries).toBe(true);
    expect(loadConfig({ OPENAI_API_KEY: "k", GITHUBPILL_LLM_QUERIES: "0" }, noGh).llmQueries).toBe(false);
  });

  it("names the missing key when the provider is explicit", () => {
    expect(() => loadConfig({ GITHUBPILL_PROVIDER: "openai" }, noGh)).toThrow(/OPENAI_API_KEY/);
  });

  it("parses the source list and rejects unknown sources", () => {
    const config = loadConfig({ OPENAI_API_KEY: "k", GITHUBPILL_SOURCES: "github, npm" }, noGh);
    expect(config.sources).toEqual(["github", "npm"]);
    expect(() => loadConfig({ OPENAI_API_KEY: "k", GITHUBPILL_SOURCES: "github,bogus" }, noGh)).toThrow(
      ConfigError,
    );
  });

  it("defaults to every source", () => {
    expect(loadConfig({ OPENAI_API_KEY: "k" }, noGh).sources).toEqual([
      "github",
      "npm",
      "pypi",
      "hackernews",
    ]);
  });

  it("rejects invalid numeric limits", () => {
    expect(() => loadConfig({ OPENAI_API_KEY: "k", GITHUBPILL_CONCURRENCY: "0" }, noGh)).toThrow(
      ConfigError,
    );
  });

  it("reads model and base URL overrides", () => {
    const config = loadConfig(
      { OPENAI_API_KEY: "k", OPENAI_BASE_URL: "http://gateway", GITHUBPILL_MODEL: "custom" },
      noGh,
    );
    expect(config.llm.baseUrl).toBe("http://gateway");
    expect(config.llm.model).toBe("custom");
  });

  it("uses an injected GitHub token resolver", () => {
    const config = loadConfig({ OPENAI_API_KEY: "k" }, { ghToken: () => "gh-token" });
    expect(config.githubToken).toBe("gh-token");
  });

  it("prefers an explicit GITHUB_TOKEN over the resolver", () => {
    const config = loadConfig({ OPENAI_API_KEY: "k", GITHUB_TOKEN: "env" }, { ghToken: () => "cli" });
    expect(config.githubToken).toBe("env");
  });
});
