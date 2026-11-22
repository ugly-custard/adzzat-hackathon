import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { Task } from "./types";
import { validateTask } from "./validate";

export interface LoadedTask { task: Task; file: string; sha256: string }
export interface LoadError { file: string; errors: string[] }

export const TASKS_DIR = process.env.TASKS_DIR ?? path.join(process.cwd(), "tasks");

export function loadTaskFile(file: string): LoadedTask | LoadError {
  let text: string, doc: unknown;
  try {
    text = readFileSync(file, "utf8");
    doc = YAML.parse(text);
  } catch (err) {
    return { file, errors: [`unreadable YAML: ${(err as Error).message}`] };
  }
  const errors = validateTask(doc);
  if (errors.length) return { file, errors };
  return { task: doc as Task, file, sha256: createHash("sha256").update(text).digest("hex") };
}

/** Invalid files are reported and skipped; they never reach the runner. */
export function loadTasks(dir = TASKS_DIR): { tasks: LoadedTask[]; errors: LoadError[] } {
  const tasks: LoadedTask[] = [];
  const errors: LoadError[] = [];
  const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort();
  for (const name of files) {
    const res = loadTaskFile(path.join(dir, name));
    if ("errors" in res) errors.push(res);
    else if (tasks.some((t) => t.task.id === res.task.id)) errors.push({ file: res.file, errors: [`duplicate task id ${res.task.id}`] });
    else tasks.push(res);
  }
  return { tasks, errors };
}
