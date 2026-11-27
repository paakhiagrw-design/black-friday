import type { Assessment, Finding } from "../types";

const categories = {
  identity: "Product identity",
  appearance: "Appearance",
  colour: "Colour",
  condition: "Visible condition",
  damage: "Visible damage",
  packaging: "Packaging",
  accessories: "Accessories",
} as const;

const statuses = ["consistent", "discrepancy", "inconclusive"] as const;
const actions = {
  seller_review: "Review the evidence and make a seller decision.",
  request_photos: "Request additional photographs before making a decision.",
  physical_inspection:
    "Inspect the item in person before deciding on rerouting.",
};
const finding = {
  type: "object",
  properties: {
    status: { type: "string", enum: statuses },
    detail: { type: "string" },
  },
  required: ["status", "detail"],
  additionalProperties: false,
};
export const comparisonSchema = {
  type: "object",
  properties: {
    findings: {
      type: "object",
      properties: Object.fromEntries(
        Object.keys(categories).map((key) => [key, finding]),
      ),
      required: Object.keys(categories),
      additionalProperties: false,
    },
    discrepancies: { type: "array", items: { type: "string" } },
    recommended_action: { type: "string", enum: Object.keys(actions) },
  },
  required: ["findings", "discrepancies", "recommended_action"],
  additionalProperties: false,
};

function objectWithKeys(
  value: unknown,
  keys: string[],
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
function concise(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= 1000
  );
}

export function parseComparison(
  text: string,
): Pick<Assessment, "findings" | "discrepancies" | "recommendation"> {
  const value: unknown = JSON.parse(text);
  const invalid = () => new Error("Invalid comparison format.");
  if (
    !objectWithKeys(value, comparisonSchema.required) ||
    !objectWithKeys(value.findings, Object.keys(categories)) ||
    !Array.isArray(value.discrepancies) ||
    value.discrepancies.length > 12 ||
    !value.discrepancies.every(concise) ||
    typeof value.recommended_action !== "string" ||
    !Object.hasOwn(actions, value.recommended_action)
  )
    throw invalid();
  const records = value.findings;
  const findings = Object.entries(categories).map(([key, label]): Finding => {
    const item = records[key];
    if (
      !objectWithKeys(item, ["status", "detail"]) ||
      !concise(item.detail) ||
      !statuses.some((status) => status === item.status)
    )
      throw invalid();
    const status = item.status as Finding["status"];
    return {
      label,
      status,
      detail: item.detail.trim(),
      tone:
        status === "discrepancy"
          ? "warning"
          : status === "consistent"
            ? "success"
            : "neutral",
    };
  });
  return {
    findings,
    discrepancies: value.discrepancies.map((s) => s.trim()),
    recommendation: actions[value.recommended_action as keyof typeof actions],
  };
}
