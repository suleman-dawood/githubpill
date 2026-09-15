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

  it("accepts GOOGLE_API_KEY as the Gemini key", () => {
    expect(loadConfig({ GEMINI_API_KEY: "g" }, noGh).llm.provider).toBe("gemini");
    expect(loadConfig({ GOOGLE_API_KEY: "g" }, noGh).llm.provider).toBe("gemini");
  });

  it("rejects an unknown provider", () => {
    expect(() => loadConfig({ GITHUBPILL_PROVIDER: "nope", OPENAI_API_KEY: "k" }, noGh)).toThrow(
      ConfigError,
    );
  });

  it("throws when no key is present", () => {
    expect(() => loadConfig({}, noGh)).toThrow(ConfigError);
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
