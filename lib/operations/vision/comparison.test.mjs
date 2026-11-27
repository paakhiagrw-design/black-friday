import assert from "node:assert/strict";
import { test } from "node:test";
import { parseComparison, comparisonSchema } from "./comparison.ts";

// Synthetic provider payloads exercise validation only. Live photo tests use the HTTP route.
function sample() {
  const categories = [
    "identity",
    "appearance",
    "colour",
    "condition",
    "damage",
    "packaging",
    "accessories",
  ];
  return {
    findings: Object.fromEntries(
      categories.map((key) => [
        key,
        { status: "inconclusive", detail: "Occluded in this test image." },
      ]),
    ),
    discrepancies: [],
    recommended_action: "request_photos",
  };
}
test("maps each structured observation to its labelled finding in display order", () => {
  const data = sample();
  data.findings.identity = {
    status: "discrepancy",
    detail: "The two items have different shapes.",
  };
  data.discrepancies = [data.findings.identity.detail];
  const result = parseComparison(JSON.stringify(data));
  assert.equal(result.findings.length, 7);
  assert.deepEqual(result.findings[0], {
    label: "Product identity",
    tone: "warning",
    ...data.findings.identity,
  });
  assert.deepEqual(result.discrepancies, data.discrepancies);
  assert.match(result.recommendation, /photographs/);
  assert.deepEqual(
    Object.keys(data.findings),
    comparisonSchema.properties.findings.required,
  );
});
test("rejects truncated output, omitted categories, unsupported actions and invalid observations", () => {
  assert.throws(() => parseComparison('{"findings":'));
  for (const change of [
    (d) => delete d.findings.packaging,
    (d) => {
      d.findings.damage.status = "confirmed_authentic";
    },
    (d) => {
      d.findings.condition.detail = " ";
    },
    (d) => {
      d.findings.colour.confidence = 0.99;
    },
    (d) => {
      d.discrepancies = [null];
    },
    (d) => {
      d.recommended_action = "approve";
    },
    (d) => {
      d.extra = "unexpected";
    },
  ]) {
    const data = sample();
    change(data);
    assert.throws(
      () => parseComparison(JSON.stringify(data)),
      /Invalid comparison/,
    );
  }
});
