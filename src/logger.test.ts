import { describe, expect, it } from "vitest";
import { createLogger, isLogLevel } from "./logger.js";

function sink(): { lines: string[]; stream: NodeJS.WritableStream } {
  const lines: string[] = [];
  const stream = {
    write: (chunk: string) => {
      lines.push(chunk);
      return true;
    },
  } as unknown as NodeJS.WritableStream;
  return { lines, stream };
}

describe("createLogger", () => {
  it("drops messages below the configured level", () => {
    const { lines, stream } = sink();
    const log = createLogger("warn", stream);
    log.error("e");
    log.warn("w");
    log.info("i");
    log.debug("d");
    expect(lines).toEqual(["e\n", "w\n"]);
  });

  it("suppresses everything at silent", () => {
    const { lines, stream } = sink();
    const log = createLogger("silent", stream);
    log.error("e");
    log.warn("w");
    expect(lines).toEqual([]);
  });

  it("emits everything at debug", () => {
    const { lines, stream } = sink();
    const log = createLogger("debug", stream);
    log.debug("d");
    expect(lines).toEqual(["d\n"]);
  });
});

describe("isLogLevel", () => {
  it("recognizes valid levels only", () => {
    expect(isLogLevel("debug")).toBe(true);
    expect(isLogLevel("nope")).toBe(false);
  });
});
