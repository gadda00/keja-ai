#!/usr/bin/env node
/**
 * deploy-guard.mjs — stop double-deploying every push to production.
 *
 * Situation (verified 2026-09-12): the Vercel Git integration is connected
 * to this repo and deploys every push to main — including the Auto-Pilot's
 * GITHUB_TOKEN pushes, which can never trigger deploy-vercel.yml (GitHub's
 * recursion-prevention rule). The CLI workflow ALSO deploys every PAT push,
 * so regular pushes ship twice and the production alias flip-flops between
 * two identical deployments while Vercel Hobby build minutes burn.
 *
 * This script answers one question for the workflow: has the integration
 * already deployed THIS commit successfully?
 *
 *   yes          → skip the CLI deploy (gates already ran; go straight to smoke)
 *   no (failed)  → fall back to the CLI deploy
 *   no (absent)  → fall back to the CLI deploy (integration disconnected/broken)
 *
 * Fails open: any API error means "deploy" — degradation is a duplicate
 * deployment (the old behaviour), never a missing one.
 *
 * Usage (from deploy-vercel.yml):
 *   node scripts/deploy-guard.mjs --repo gadda00/keja-ai --sha "$GITHUB_SHA" \
 *        --token "$GITHUB_TOKEN"
 *
 * Emits GitHub Actions outputs:
 *   should-deploy = "true" | "false"   reason = human-readable explanation
 */
import { parseArgs } from "node:util";
import { appendFileSync } from "node:fs";

/* ---------- pure decision logic (unit-tested in tests/deployGuard.test.ts) ---------- */

/**
 * Decide whether the CLI workflow still needs to deploy a commit.
 *
 * @param {Array<{id:number, creator:string, environment:string}> | null | undefined} deployments
 *   GitHub deployments for the exact SHA (any creators).
 * @param {(id:number) => Promise<string>} latestStatus
 *   Resolves the newest deployment-status state for a deployment id:
 *   "success" | "failure" | "in_progress" | "queued" | "unknown" | …
 * @returns {Promise<["skip"|"deploy"|"wait", string]>} [decision, reason]
 */
export async function decide(deployments, latestStatus) {
  const vercelDeploys = (deployments ?? []).filter((d) => d.creator === "vercel[bot]");
  if (vercelDeploys.length === 0) {
    return ["deploy", "no vercel[bot] deployment exists for this SHA"];
  }
  // GitHub returns deployments newest-first; if that ever flips, the
  // statuses query below still decides on state, not order.
  const newest = vercelDeploys[vercelDeploys.length - 1];
  const status = await latestStatus(newest.id);
  if (status === "success") {
    return ["skip", `vercel[bot] deployment ${newest.id} already succeeded for this SHA`];
  }
  if (status === "failure") {
    return ["deploy", `vercel[bot] deployment ${newest.id} failed — CLI retry as fallback`];
  }
  // queued / in_progress / unknown → the caller's wait window decides
  return ["wait", `vercel[bot] deployment ${newest.id} is ${status}`];
}

/* ---------- GitHub API plumbing (injected for testability) ---------- */

const API = "https://api.github.com";

async function gh(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

async function listDeployments(repo, sha, token) {
  const out = await gh(`/repos/${repo}/deployments?sha=${sha}&per_page=50`, token);
  return (out ?? []).map((d) => ({
    id: d.id,
    creator: d.creator?.login ?? "?",
    environment: d.environment ?? "",
  }));
}

async function latestDeploymentStatus(repo, deploymentId, token) {
  const out = await gh(`/repos/${repo}/deployments/${deploymentId}/statuses?per_page=1`, token);
  return out?.[0]?.state ?? "unknown";
}

/**
 * Poll the integration deployment until terminal or the wait window closes.
 * @param {{repo:string, sha:string, token?:string, waitMinutes?:number,
 *          pollSeconds?:number, list?:Function, status?:Function,
 *          sleepFn?:Function, log?:Function}} cfg
 */
export async function pollUntilTerminalOrTimeout(cfg) {
  const list = cfg.list ?? listDeployments;
  const status = cfg.status ?? latestDeploymentStatus;
  const sleep = cfg.sleepFn ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const log = cfg.log ?? (() => {});
  const deadline = Date.now() + (cfg.waitMinutes ?? 6) * 60_000;
  let lastReason = "no deployment yet";
  while (Date.now() < deadline) {
    try {
      const deployments = await list(cfg.repo, cfg.sha, cfg.token);
      const [decision, reason] = await decide(deployments, (id) =>
        status(cfg.repo, id, cfg.token),
      );
      lastReason = reason;
      if (decision === "skip" || decision === "deploy") return { decision, reason };
      log(`[deploy-guard] ${reason} — waiting…`);
    } catch (err) {
      // fail open: API trouble means duplicate deploy, not missing deploy
      return { decision: "deploy", reason: `GitHub API error: ${err.message}` };
    }
    await sleep((cfg.pollSeconds ?? 20) * 1000);
  }
  return { decision: "deploy", reason: `wait window elapsed: ${lastReason}` };
}

/* ---------- main ---------- */

const isMain =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const { values: args } = parseArgs({
    options: {
      repo: { type: "string" },
      sha: { type: "string" },
      token: { type: "string", default: process.env.GITHUB_TOKEN ?? "" },
      "wait-minutes": { type: "string", default: "6" },
      "poll-seconds": { type: "string", default: "20" },
    },
  });
  if (!args.repo || !args.sha) {
    console.error("[deploy-guard] --repo and --sha are required");
    process.exit(2);
  }
  const { decision, reason } = await pollUntilTerminalOrTimeout({
    repo: args.repo,
    sha: args.sha,
    token: args.token,
    waitMinutes: Number(args["wait-minutes"]),
    pollSeconds: Number(args["poll-seconds"]),
    log: console.log,
  });
  const shouldDeploy = decision === "deploy";
  console.log(`[deploy-guard] should-deploy=${shouldDeploy} — ${reason}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `should-deploy=${shouldDeploy}\nreason=${reason}\n`);
  }
  process.exit(0);
}
