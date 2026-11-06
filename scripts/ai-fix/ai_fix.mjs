#!/usr/bin/env node
// AI fix: when a workflow run fails, read the failed-step logs, ask a model for the root cause
// and a minimal patch, and write both to docs/ai-fix/AI-FIX-REPORT.md plus (optionally) a .patch.
// No dependencies (Node 22+). Nothing is merged automatically; a human reviews the PR.
//
//   node scripts/ai-fix/ai_fix.mjs --run <run_id>            analyse that run, write report + patch
//   node scripts/ai-fix/ai_fix.mjs --run <run_id> --dry-run  print the report, write nothing
//   node scripts/ai-fix/ai_fix.mjs --logs <file>             analyse a saved log file instead of a run
//
// Env:  GITHUB_TOKEN       required. Reads Actions logs and calls GitHub Models (models: read).
//       GITHUB_REPOSITORY  owner/repo (set by Actions).
//       AI_FIX_MODEL       default "openai/gpt-4.1" (any model on models.github.ai).
//       AI_FIX_ENDPOINT    default "https://models.github.ai/inference/chat/completions" (tests).
//       ANTHROPIC_API_KEY  optional. When set, Claude is used instead of GitHub Models.
//       AI_FIX_CLAUDE_MODEL default "claude-sonnet-4-5".
// Outputs (GITHUB_OUTPUT): patch=1|0, title=<short title>
// Exit code: 0 when a report was produced (even if there's no patch), 2 on bad input or no token.

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "docs/ai-fix");
const REPORT = path.join(OUT, "AI-FIX-REPORT.md");
const PATCH = path.join(OUT, "ai-fix.patch");
const MAX_LOG = 60_000;      // chars of log sent to the model (tail wins; errors are at the end)
const MAX_FILE = 12_000;     // chars per referenced source file

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const dry = args.includes("--dry-run");
const runId = flag("--run");
const logFile = flag("--logs");
const repo = process.env.GITHUB_REPOSITORY || "";
const token = process.env.GITHUB_TOKEN;

if (!runId && !logFile) { console.error("usage: ai_fix.mjs --run <id> | --logs <file> [--dry-run]"); process.exit(2); }
if (!token && !logFile) { console.error("GITHUB_TOKEN is required"); process.exit(2); }

const gh = (...a) => execFileSync("gh", a, { encoding: "utf8", env: { ...process.env, GH_TOKEN: token }, maxBuffer: 64 << 20 });

function fetchLogs() {
  if (logFile) return { logs: readFileSync(logFile, "utf8"), meta: { name: path.basename(logFile), url: "", jobs: [] } };
  const meta = JSON.parse(gh("run", "view", runId, "-R", repo, "--json", "name,workflowName,headBranch,headSha,url,event,jobs"));
  let logs = "";
  try { logs = gh("run", "view", runId, "-R", repo, "--log-failed"); } catch (e) { logs = String(e.stdout || e.message); }
  if (!logs.trim()) logs = "(no failed-step logs were available; the job may have been cancelled or timed out)";
  return { logs, meta: { ...meta, name: meta.workflowName || meta.name, jobs: (meta.jobs || []).filter((j) => j.conclusion === "failure").map((j) => j.name) } };
}

// Strip ANSI, timestamps and the "job<TAB>step<TAB>" prefix that --log-failed adds; keep the tail.
function clean(raw) {
  const lines = raw.split("\n").map((l) =>
    l.replace(/(?:\x1b|\^\[)\[[0-9;]*m/g, "").replace(/^[^\t]*\t[^\t]*\t/, "").replace(/^\uFEFF?\d{4}-\d\d-\d\dT[\d:.]+Z\s?/, ""));
  const text = lines.join("\n").trim();
  return text.length > MAX_LOG ? "…(truncated)…\n" + text.slice(-MAX_LOG) : text;
}

// Files the log mentions that exist in the repo (workflows, scripts), so the model can patch real code.
function referencedFiles(logs, meta) {
  const found = new Set();
  for (const m of logs.matchAll(/(?:^|[\s"'`(])((?:\.github|scripts|docs|src|redteam|noizybkz)\/[\w./-]+\.[\w]+)/g)) found.add(m[1]);
  const wfDir = path.join(ROOT, ".github/workflows");
  if (existsSync(wfDir) && meta.name) {
    const esc = meta.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const f of readdirSync(wfDir)) {
      const p = path.join(wfDir, f);
      if (statSync(p).isFile() && new RegExp(`^name:\\s*["']?${esc}["']?\\s*$`, "m").test(readFileSync(p, "utf8"))) found.add(`.github/workflows/${f}`);
    }
  }
  const files = [];
  for (const rel of found) {
    const p = path.join(ROOT, rel);
    if (!p.startsWith(ROOT + path.sep) || !existsSync(p) || !statSync(p).isFile()) continue;
    const body = readFileSync(p, "utf8");
    files.push({ path: rel, body: body.length > MAX_FILE ? body.slice(0, MAX_FILE) + "\n…(truncated)…" : body });
    if (files.length >= 6) break;
  }
  return files;
}

const SYSTEM = `You are a senior CI engineer fixing a failed GitHub Actions run. Be precise and conservative.
Respond with exactly these sections, in this order, using these headings:
## Title
One line, under 70 chars, imperative (e.g. "cf-watch: skip issue post when issues are disabled").
## Root cause
2-6 sentences. Quote the decisive log line.
## Fix
Bullet list of the minimal change. Say "manual" if it needs a secret, a repo setting, or a human decision, and explain what to do.
## Patch
A unified diff (git format, paths relative to repo root, with "a/" and "b/" prefixes) touching only the provided files,
inside a \`\`\`diff fence. If no safe code change exists, write exactly: NO_PATCH
Rules: never add secrets; never weaken security checks; never delete tests; prefer graceful fallbacks over disabling steps.`;

async function ask(prompt) {
  if (process.env.ANTHROPIC_API_KEY) {
    const model = process.env.AI_FIX_CLAUDE_MODEL || "claude-sonnet-4-5";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 4000, system: SYSTEM, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return { model, text: (await r.json()).content.map((c) => c.text || "").join("") };
  }
  const model = process.env.AI_FIX_MODEL || "openai/gpt-4.1";
  const r = await fetch(process.env.AI_FIX_ENDPOINT || "https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
    body: JSON.stringify({ model, temperature: 0.1, max_tokens: 4000, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`GitHub Models HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return { model, text: (await r.json()).choices[0].message.content };
}

function section(text, name) {
  const m = text.match(new RegExp(`##\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i"));
  return m ? m[1].trim() : "";
}

function extractPatch(text) {
  const p = section(text, "Patch");
  if (!p || /NO_PATCH/.test(p)) return "";
  const m = p.match(/```(?:diff|patch)?\s*\n([\s\S]*?)```/);
  const diff = (m ? m[1] : p).trim() + "\n";
  return /^(diff --git|--- a\/)/m.test(diff) ? diff : "";
}

// Patch must apply cleanly and only touch files we showed the model.
function patchApplies(diff, allowed) {
  const touched = [...diff.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1].trim());
  if (!touched.length || touched.some((t) => !allowed.includes(t))) return false;
  try { execFileSync("git", ["apply", "--check", "-"], { cwd: ROOT, input: diff, stdio: ["pipe", "ignore", "ignore"] }); return true; }
  catch { return false; }
}

const out = (k, v) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${String(v).replace(/\n/g, " ")}\n`);

(async () => {
  const { logs: raw, meta } = fetchLogs();
  const logs = clean(raw);
  const files = referencedFiles(logs, meta);
  const prompt = [
    `Repository: ${repo}`, `Workflow: ${meta.name}`, `Failed jobs: ${meta.jobs.join(", ") || "(unknown)"}`,
    `Branch: ${meta.headBranch || "?"}  Event: ${meta.event || "?"}  Run: ${meta.url || runId || logFile}`,
    "", "### Failed-step logs", "```", logs, "```", "",
    ...files.flatMap((f) => [`### File: ${f.path}`, "```", f.body, "```", ""]),
  ].join("\n");

  let answer;
  try { answer = await ask(prompt); }
  catch (e) {
    answer = { model: "none", text: `## Title\nCI failure in ${meta.name}\n## Root cause\nThe AI analysis itself failed: ${e.message}\n## Fix\n- manual: inspect the logs below.\n## Patch\nNO_PATCH` };
  }

  const title = section(answer.text, "Title").split("\n")[0].replace(/^["'`]|["'`]$/g, "").slice(0, 70) || `CI failure in ${meta.name}`;
  const patch = extractPatch(answer.text);
  const ok = Boolean(patch) && patchApplies(patch, files.map((f) => f.path));

  const report = [
    `# AI fix report: ${meta.name}`, "",
    `- Run: ${meta.url || runId || logFile}`, `- Failed jobs: ${meta.jobs.join(", ") || "(unknown)"}`, `- Model: ${answer.model}`,
    `- Patch: ${ok ? "applies cleanly (see PR)" : patch ? "proposed but does NOT apply cleanly; included below for reference" : "none (manual fix)"}`, "",
    "## Root cause", section(answer.text, "Root cause") || "(none given)", "",
    "## Fix", section(answer.text, "Fix") || "(none given)", "",
    ...(patch && !ok ? ["## Proposed patch (not applied)", "```diff", patch.trim(), "```", ""] : []),
    "<details><summary>Failed-step logs (tail)</summary>", "", "```", logs.slice(-8000), "```", "</details>", "",
    "_Generated by `scripts/ai-fix/ai_fix.mjs`. Nothing is merged automatically._",
  ].join("\n");

  if (dry) { console.log(report); if (ok) console.log("\n--- patch ---\n" + patch); return; }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(REPORT, report + "\n");
  if (ok) writeFileSync(PATCH, patch); else if (existsSync(PATCH)) writeFileSync(PATCH, "");
  out("patch", ok ? 1 : 0);
  out("title", title);
  console.log(`report: ${path.relative(ROOT, REPORT)}  patch: ${ok ? "yes" : "no"}  title: ${title}`);
})().catch((e) => { console.error(e); process.exit(2); });
