import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptsOrigin, isLoopbackRequest } from "../request-origin.ts";

test("accepts genuine loopback and configured Railway origins behind the proxy", () => {
  const request = (host, origin) =>
    new Request("http://localhost:3100/api/verification", {
      headers: { host, origin },
    });
  const previousDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  const previousOrigin = process.env.RIP_PUBLIC_ORIGIN;
  try {
    process.env.RAILWAY_PUBLIC_DOMAIN = "example.up.railway.app";
    process.env.RIP_PUBLIC_ORIGIN = "https://returns.example.com";
    assert(acceptsOrigin(request("127.0.0.1:3100", "http://127.0.0.1:3100")));
    assert(
      acceptsOrigin(request("internal", "https://example.up.railway.app")),
    );
    assert(acceptsOrigin(request("internal", "https://returns.example.com")));
    assert(
      !acceptsOrigin(
        request("internal", "https://returns.example.com.other.test"),
      ),
    );
    assert(
      !acceptsOrigin(request("internal", "http://example.up.railway.app")),
    );
    assert(!acceptsOrigin(request("127.0.0.1:3100", "http://127.0.0.1:9999")));
    assert(
      !isLoopbackRequest(request("public.example", "http://localhost:3100")),
    );
  } finally {
    if (previousDomain === undefined) delete process.env.RAILWAY_PUBLIC_DOMAIN;
    else process.env.RAILWAY_PUBLIC_DOMAIN = previousDomain;
    if (previousOrigin === undefined) delete process.env.RIP_PUBLIC_ORIGIN;
    else process.env.RIP_PUBLIC_ORIGIN = previousOrigin;
  }
});
