import { describe, expect, it } from "vitest";
import { errorMessage } from "./response.js";

describe("errorMessage", () => {
  it("reads an object error message", () => {
    expect(errorMessage('{"error":{"message":"bad key"}}', 401)).toBe("bad key");
  });

  it("reads a string error", () => {
    expect(errorMessage('{"error":"nope"}', 400)).toBe("nope");
  });

  it("reads a top-level message", () => {
    expect(errorMessage('{"message":"oops"}', 400)).toBe("oops");
  });

  it("falls back to the raw body", () => {
    expect(errorMessage("plain text failure", 500)).toBe("plain text failure");
  });

  it("falls back to the status when the body is empty", () => {
    expect(errorMessage("   ", 500)).toBe("HTTP 500");
  });
});
