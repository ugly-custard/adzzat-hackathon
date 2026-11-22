"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gradeRun } from "@/lib/harness/replay";

export async function regrade(formData: FormData): Promise<void> {
  const runId = String(formData.get("run_id"));
  const grader = String(formData.get("grader"));
  if (!/^[\w.-]+$/.test(runId)) throw new Error("invalid run id");
  let error = "";
  try {
    await gradeRun(runId, grader);
  } catch (err) {
    // Refusals (changed grader without a version bump, tampered trace) are expected outcomes, shown inline.
    error = (err as Error).message;
  }
  revalidatePath(`/runs/${runId}`);
  redirect(`/runs/${runId}${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}
