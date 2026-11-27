import assert from "node:assert/strict";
import { test } from "node:test";

// Opt in explicitly. A cold run submits two paid requests against fixture returns.
test(
  "OpenAI distinguishes matching and mismatching photos and reuses the results",
  {
    skip: process.env.RIP_LIVE_VISION !== "1",
  },
  async () => {
    const endpoint = new URL("/api/verification", process.env.RIP_TEST_ORIGIN);
    assert(
      ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname),
      "Use an isolated local test server.",
    );
    const ids = [
      Number(process.env.RIP_TEST_MATCH_ID),
      Number(process.env.RIP_TEST_MISMATCH_ID),
    ];
    assert(
      ids.every((id) => Number.isSafeInteger(id) && id > 0) &&
        ids[0] !== ids[1],
      "Provide two distinct return fixture IDs.",
    );
    const headers = { "Content-Type": "application/json" };
    if (process.env.RIP_VISION_ACCESS_TOKEN)
      headers.Authorization = `Bearer ${process.env.RIP_VISION_ACCESS_TOKEN}`;
    async function scan(id) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        redirect: "error",
        body: JSON.stringify({ returnId: id, action: "scan" }),
      });
      const body = await response.json();
      assert.equal(response.status, 200, body.error);
      return body.assessment;
    }
    for (const [index, id] of ids.entries()) {
      const [assessment, concurrent] = await Promise.all([scan(id), scan(id)]);
      assert.match(assessment.responseId, /^resp_/);
      assert.equal(concurrent.responseId, assessment.responseId);
      assert.equal(assessment.findings.length, 7);
      assert.equal(
        assessment.findings[0].status,
        index === 0 ? "consistent" : "discrepancy",
      );
      const replay = await scan(id);
      assert.equal(replay.cached, true);
      assert.equal(replay.responseId, assessment.responseId);
    }
  },
);
