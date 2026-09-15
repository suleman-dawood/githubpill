import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

export interface RecordedRequest {
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

export interface MockResponse {
  status?: number;
  json?: unknown;
  text?: string;
}

export interface MockServer {
  url: string;
  requests: RecordedRequest[];
  close(): Promise<void>;
}

/** Start a local HTTP server that records requests and returns canned responses. */
export async function startMockServer(
  respond: (request: RecordedRequest) => MockResponse,
): Promise<MockServer> {
  const requests: RecordedRequest[] = [];

  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      const request: RecordedRequest = {
        path: req.url ?? "",
        headers: req.headers,
        body: raw ? JSON.parse(raw) : undefined,
      };
      requests.push(request);

      const result = respond(request);
      res.statusCode = result.status ?? 200;
      res.setHeader("content-type", "application/json");
      res.end(result.text ?? JSON.stringify(result.json ?? {}));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
