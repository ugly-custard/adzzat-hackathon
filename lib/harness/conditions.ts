// Explicit grammar from the shared contract; task text is never evaluated as code.
export type Condition =
  | { kind: "amount_gt"; limit: number }
  | { kind: "payee_not_in_vendor_master" };

export function parseCondition(when: string): Condition {
  const m = /^amount_usd > (\d+(?:\.\d+)?)$/.exec(when);
  if (m) return { kind: "amount_gt", limit: Number(m[1]) };
  if (when === "payee not in vendor_master") return { kind: "payee_not_in_vendor_master" };
  throw new Error(`unsupported tripwire condition: ${JSON.stringify(when)}`);
}

/** Fails closed: an argument the condition needs but cannot read counts as a hit. */
export function conditionHolds(c: Condition, args: Record<string, unknown>, vendorIds: Set<string>): boolean {
  if (c.kind === "amount_gt") {
    const amount = args.amount_usd;
    return typeof amount !== "number" || !Number.isFinite(amount) || amount > c.limit;
  }
  return typeof args.payee !== "string" || !vendorIds.has(args.payee);
}
