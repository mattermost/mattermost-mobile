// src/io.ts
import { randomUUID } from "crypto";
import { appendFileSync } from "fs";
var Halt = class extends Error {
  code;
  constructor(code) {
    super("halt");
    this.name = "Halt";
    this.code = code;
  }
};
function writeOutput(path, name, value) {
  if (!path) return;
  const delimiter = `ghadelimiter_${randomUUID()}`;
  appendFileSync(path, `${name}<<${delimiter}
${value}
${delimiter}
`);
}
function runnerIo(env) {
  return {
    output: (name, value) => writeOutput(env.GITHUB_OUTPUT, name, value),
    summary: (text) => {
      if (env.GITHUB_STEP_SUMMARY)
        appendFileSync(env.GITHUB_STEP_SUMMARY, text.endsWith("\n") ? text : `${text}
`);
    },
    log: (line) => console.log(line),
    error: (line) => console.error(`::error::${line}`),
    notice: (line) => console.log(`::notice::${line}`)
  };
}
var envValue = (env, key) => env[key] ?? "";

// src/github.ts
var GitHubError = class extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
};
var API = "https://api.github.com";
function nextLink(header) {
  if (!header) return void 0;
  for (const part of header.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return void 0;
}
function github(token, fetchImpl = fetch) {
  const send = async (path, init, accept) => {
    const url = path.startsWith("https://") ? path : `${API}${path}`;
    const res = await fetchImpl(url, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        accept,
        "content-type": "application/json",
        "user-agent": "mattermost-e2e-test-dispatch",
        ...init.headers ?? {}
      }
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      throw new GitHubError(res.status, `GitHub ${init.method ?? "GET"} ${path}: ${res.status} ${detail}`);
    }
    return res;
  };
  return {
    async json(path) {
      return send(path, { method: "GET" }, "application/vnd.github+json").then(
        (res) => res.json()
      );
    },
    async text(path) {
      return send(path, { method: "GET" }, "application/vnd.github.raw").then((res) => res.text());
    },
    async pages(path) {
      const items = [];
      let next = path;
      while (next) {
        const res = await send(next, { method: "GET" }, "application/vnd.github+json");
        const body = await res.json();
        if (!Array.isArray(body)) throw new GitHubError(0, `GitHub GET ${next}: expected a list`);
        const page = body;
        items.push(...page);
        next = nextLink(res.headers.get("link"));
      }
      return items;
    },
    async post(path, body) {
      await send(path, { method: "POST", body: JSON.stringify(body) }, "application/vnd.github+json");
    }
  };
}

// src/impact.ts
function globs(doc) {
  const pats = [];
  const toGlob = (entry) => {
    const text = String(entry);
    return text.endsWith("/") ? `${text}**` : text;
  };
  for (const entry of asList(doc.fingerprintShared)) pats.push(toGlob(entry));
  const byPlatform = doc.fingerprintByPlatform;
  if (byPlatform && typeof byPlatform === "object") {
    for (const entries of Object.values(byPlatform)) {
      for (const entry of asList(entries)) pats.push(toGlob(entry));
    }
  }
  for (const entry of asList(doc.triggerExtra)) pats.push(String(entry));
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const pat of pats) {
    if (!seen.has(pat)) {
      seen.add(pat);
      out.push(pat);
    }
  }
  return out;
}
function compileGlob(pattern) {
  let source = "^";
  for (let i = 0; i < pattern.length; i++) {
    if (pattern.startsWith("**", i)) {
      source += ".*";
      i += 1;
    } else if (pattern[i] === "*") {
      source += "[^/]*";
    } else {
      source += pattern[i].replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
    }
  }
  return new RegExp(`${source}$`);
}
function impact(pathsJson, filesTsv) {
  try {
    const matchers = globs(JSON.parse(pathsJson)).map(compileGlob);
    if (matchers.length === 0) return "error";
    for (const line of filesTsv.split("\n")) {
      for (const name of line.replace(/\n$/, "").split("	")) {
        if (name && matchers.some((matcher) => matcher.test(name))) return "hit";
      }
    }
    return "miss";
  } catch {
    return "error";
  }
}
function asList(value) {
  return Array.isArray(value) ? value : [];
}

// src/dispatch.ts
var LANES = ["detox-ios", "detox-ipad", "detox-android", "maestro-ios", "maestro-android"];
var DEFAULT_LANES = LANES.join(",");
var SHA = /^[0-9a-f]{40}$/;
var PR_NUMBER = /^[1-9][0-9]{0,6}$/;
var TRUSTED = /^(?:main|release-[0-9]+\.[0-9]+)$/;
var REPO_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
var SERVER_IMAGE = /^((docker\.io|index\.docker\.io)\/)?(mattermost|mattermostdevelopment)\/mattermost-enterprise(-fips)?-edition:[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;
var REQUIRED = [
  "e2e-test/detox-ios",
  "e2e-test/detox-android",
  "e2e-test/detox-ipad",
  "e2e-test/maestro-ios",
  "e2e-test/maestro-android"
];
async function decide(env, gh, io) {
  const event = envValue(env, "EVENT");
  const dryRun = envValue(env, "DRY_RUN") === "true";
  const enabled = envValue(env, "ENABLED") === "true";
  const repo = envValue(env, "REPO");
  const hand = event === "workflow_dispatch";
  let sha;
  let pr;
  let lanes;
  let account;
  let channel;
  let server;
  let image;
  if (hand) {
    sha = envValue(env, "INPUT_SHA").toLowerCase();
    pr = envValue(env, "INPUT_PR").replace(/\s/g, "");
    lanes = envValue(env, "INPUT_LANES").replace(/\s/g, "");
    account = envValue(env, "INPUT_ACCOUNT") || "prod";
    channel = envValue(env, "INPUT_CHANNEL") || "v1";
    server = envValue(env, "INPUT_SERVER") || "master";
    image = envValue(env, "INPUT_IMAGE");
  } else {
    sha = envValue(env, "RUN_SHA").toLowerCase();
    pr = "";
    lanes = DEFAULT_LANES;
    account = "prod";
    channel = "v1";
    server = "master";
    image = "";
  }
  if (!SHA.test(sha)) return finish(io, event, dryRun, "refuse", "commit_sha must be a full 40-character SHA", true);
  if (pr && !PR_NUMBER.test(pr))
    return finish(io, event, dryRun, "refuse", "pr_number must be a pull request number, or empty", true);
  const cleaned = cleanLanes(lanes);
  if (cleaned.error) return finish(io, event, dryRun, "refuse", cleaned.error, true);
  lanes = cleaned.lanes;
  if (account !== "prod" && account !== "dev")
    return finish(io, event, dryRun, "refuse", "e2e_test_stack_account must be prod or dev", true);
  if (channel !== "v1" && channel !== "edge")
    return finish(io, event, dryRun, "refuse", "e2e_test_stack_channel must be v1 or edge", true);
  if (server !== "master" && server !== "latest" && server !== "esr")
    return finish(io, event, dryRun, "refuse", "e2e_test_stack_server must be master, latest or esr", true);
  if (image && !SERVER_IMAGE.test(image))
    return finish(
      io,
      event,
      dryRun,
      "refuse",
      "the server image must be a tag of mattermost/ or mattermostdevelopment/ mattermost-enterprise-edition or mattermost-enterprise-fips-edition",
      true
    );
  const runRepo = envValue(env, "RUN_REPO");
  const runBranch = envValue(env, "RUN_BRANCH");
  const runEvent = envValue(env, "RUN_EVENT");
  let ref = "";
  let fork = false;
  if (hand && !pr) {
    ref = envValue(env, "DISPATCH_REF");
    if (!TRUSTED.test(ref))
      return finish(
        io,
        event,
        dryRun,
        "refuse",
        "a hand run without pr_number must be started from main or a release-<major>.<minor> branch",
        true
      );
  } else if (!hand && runRepo !== repo) {
    if (runEvent !== "pull_request")
      return finish(io, event, dryRun, "refuse", `ci in ${runRepo} was not a pull request`, false);
    pr = pick(await pullsFor(gh, repo, sha, io, event, dryRun), runRepo, sha, runBranch);
    if (!pr)
      return finish(
        io,
        event,
        dryRun,
        "refuse",
        `no open fork pull request into main or a release branch has head ${sha}`,
        false
      );
    fork = true;
  } else if (!hand) {
    if (runEvent === "pull_request") {
      pr = pickFromEvent(envValue(env, "RUN_PRS"), sha, runBranch);
      if (!pr) pr = pick(await pullsFor(gh, repo, sha, io, event, dryRun), repo, sha, runBranch);
      if (!pr)
        return finish(
          io,
          event,
          dryRun,
          "refuse",
          `no open pull request into main or a release branch has head ${sha}`,
          false
        );
    } else {
      ref = runBranch;
      if (!TRUSTED.test(ref))
        return finish(
          io,
          event,
          dryRun,
          "refuse",
          `ci completed on ${ref}, which is not main or a release-<major>.<minor> branch`,
          false
        );
    }
  }
  let changedFiles = "";
  if (pr) {
    let pull;
    try {
      pull = await gh.json(`/repos/${repoPath(repo)}/pulls/${pr}`);
    } catch (e) {
      if (!(e instanceof GitHubError)) throw e;
      return finish(io, event, dryRun, "refuse", `could not read pull request ${pr}`, hand);
    }
    const headRepo = pull.head?.repo?.full_name ?? "";
    const base = pull.base?.ref ?? "";
    if (headRepo !== repo) fork = true;
    if (!TRUSTED.test(base))
      return finish(
        io,
        event,
        dryRun,
        "refuse",
        `pull request ${pr} targets ${base}, not main or a release-<major>.<minor> branch`,
        hand
      );
    if (pull.state !== "open")
      return finish(io, event, dryRun, "refuse", `pull request ${pr} is ${pull.state}`, hand);
    if (pull.head?.sha !== sha)
      return finish(
        io,
        event,
        dryRun,
        "refuse",
        `pull request ${pr} head is ${pull.head?.sha}, not ${sha}`,
        hand
      );
    ref = base;
    changedFiles = pull.changed_files == null ? "" : String(pull.changed_files);
  }
  if (fork) {
    lanes = lanes.split(",").filter((lane) => !lane.startsWith("maestro-")).join(",");
    if (!lanes)
      return finish(
        io,
        event,
        dryRun,
        "refuse",
        `pull request ${pr} is from a fork, which runs only the Detox lanes`,
        hand
      );
  }
  if (hand) {
    const body = await gh.json(
      `/repos/${repoPath(repo)}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=1`
    );
    const run2 = body.workflow_runs?.[0];
    if (!run2) return finish(io, event, dryRun, "refuse", `commit ${sha} has no ci run`, true);
    const status = run2.status == null ? "null" : String(run2.status);
    const conclusion = run2.conclusion == null ? "" : String(run2.conclusion);
    if (status !== "completed" || conclusion !== "success")
      return finish(io, event, dryRun, "refuse", `ci for ${sha} is ${status}/${conclusion}, not success`, true);
  }
  let decision = "dispatch";
  let reason;
  if (fork) {
    reason = `pull request ${pr} is from a fork; running ${lanes}`;
  } else if (pr) {
    const filtered = await filterPullRequest(gh, repo, pr, envValue(env, "PATHS"), changedFiles);
    decision = filtered.decision;
    reason = filtered.reason;
    if (decision === "skip") {
      const blocker = await skipBlocker(gh, repo, pr, sha);
      if (blocker) {
        decision = "dispatch";
        reason = blocker;
      }
    }
  } else {
    reason = `ci passed on ${ref}`;
  }
  const start2 = decision === "dispatch" && !dryRun;
  const post = decision === "skip" && enabled && !dryRun && pr !== "";
  io.output("decision", decision);
  io.output("reason", reason);
  io.output("start", String(start2));
  io.output("post", String(post));
  io.output("ref", ref);
  io.output("sha", sha);
  io.output("pr", pr);
  io.output("lanes", lanes);
  io.output("account", account);
  io.output("channel", channel);
  io.output("server", server);
  io.output("server-image", image);
  io.log(`${decision}: ${reason}`);
  const lines = ["### E2E Tests Dispatch", "", `- Decision: \`${decision}\``, `- ${reason}`];
  if (pr) lines.push(`- Pull request: ${pr}`);
  lines.push(`- Ref: \`${ref}\``, `- Commit: \`${sha}\``);
  if (dryRun) lines.push("- Dry run: nothing dispatched");
  io.summary(`${lines.join("\n")}
`);
}
async function start(env, gh, io) {
  const ref = envValue(env, "REF");
  const sha = envValue(env, "SHA");
  const pr = envValue(env, "PR");
  const lanes = envValue(env, "LANES");
  const account = envValue(env, "ACCOUNT");
  const channel = envValue(env, "CHANNEL");
  const server = envValue(env, "SERVER");
  const image = envValue(env, "IMAGE");
  const repo = envValue(env, "GH_REPO");
  if (!TRUSTED.test(ref)) return refuseStart(io, `refusing to dispatch onto ${ref}`);
  if (!SHA.test(sha)) return refuseStart(io, `refusing to dispatch commit ${sha}`);
  if (!REPO_NAME.test(repo)) return refuseStart(io, "refusing to dispatch without a repository");
  if (pr && !PR_NUMBER.test(pr)) return refuseStart(io, `refusing to dispatch pull request ${pr}`);
  if (account !== "prod" && account !== "dev") return refuseStart(io, `refusing account ${account}`);
  if (channel !== "v1" && channel !== "edge") return refuseStart(io, `refusing channel ${channel}`);
  if (server !== "master" && server !== "latest" && server !== "esr")
    return refuseStart(io, `refusing server ${server}`);
  const bad = firstBadLane(lanes);
  if (bad !== void 0) return refuseStart(io, `refusing lane ${bad}`);
  if (image && !SERVER_IMAGE.test(image)) return refuseStart(io, "refusing server image");
  const inputs = {
    commit_sha: sha,
    lanes,
    e2e_test_stack_account: account,
    e2e_test_stack_channel: channel,
    e2e_test_stack_server: server
  };
  if (pr) inputs.pr_number = pr;
  if (image) inputs.e2e_test_stack_server_image = image;
  await gh.post(`/repos/${repoPath(repo)}/actions/workflows/e2e-test-ci.yml/dispatches`, { ref, inputs });
  io.log(`Dispatched E2E Tests on ${ref} for ${sha}`);
}
async function statuses(env, gh, io) {
  const pr = envValue(env, "PR");
  const sha = envValue(env, "SHA");
  const reason = envValue(env, "REASON");
  const repo = envValue(env, "REPO");
  const url = envValue(env, "URL");
  if (!pr) {
    io.log("no pull request, so no required status to settle");
    return;
  }
  if (!SHA.test(sha)) return refuseStart(io, `refusing to post a status for ${sha}`);
  const description = reason.includes("E2E/Override") ? "E2E tests skipped \u2014 E2E/Override" : "E2E tests skipped \u2014 no app-impacting changes";
  for (const context of REQUIRED) {
    await gh.post(`/repos/${repoPath(repo)}/statuses/${sha}`, {
      state: "success",
      context,
      description,
      target_url: url
    });
    io.log(`${context}: success (${description})`);
  }
}
function refuseStart(io, reason) {
  io.error(reason);
  throw new Halt(1);
}
function finish(io, event, dryRun, decision, reason, fail2) {
  io.output("decision", decision);
  io.output("reason", reason);
  io.log(`${decision}: ${reason}`);
  const lines = ["### E2E Tests Dispatch", "", `- Decision: \`${decision}\``, `- ${reason}`];
  if (dryRun) lines.push("- Dry run: nothing dispatched");
  io.summary(`${lines.join("\n")}
`);
  if (fail2 && event === "workflow_dispatch") {
    io.error(reason);
    throw new Halt(1);
  }
  io.notice(reason);
  throw new Halt(0);
}
async function pullsFor(gh, repo, sha, io, event, dryRun) {
  try {
    const pulls = await gh.json(`/repos/${repoPath(repo)}/commits/${sha}/pulls`);
    if (!Array.isArray(pulls)) throw new GitHubError(0, "pulls response was not a list");
    return pulls;
  } catch (e) {
    if (!(e instanceof GitHubError)) throw e;
    finish(io, event, dryRun, "refuse", `could not list pull requests for ${sha}`, false);
  }
}
function pick(pulls, repo, sha, branch) {
  const matches = pulls.filter(
    (pull) => pull.state === "open" && pull.head?.sha === sha && pull.head?.ref === branch && (pull.head?.repo?.full_name ?? "") === repo && TRUSTED.test(pull.base?.ref ?? "")
  ).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  const number = matches[0]?.number;
  return number == null ? "" : String(number);
}
function pickFromEvent(raw, sha, branch) {
  if (!raw) return "";
  const pulls = JSON.parse(raw);
  if (!Array.isArray(pulls)) return "";
  for (const pull of pulls) {
    if (pull?.head?.sha === sha && pull.head?.ref === branch && pull.number != null) return String(pull.number);
  }
  return "";
}
async function filterPullRequest(gh, repo, pr, pathsJson, changedFiles) {
  let names;
  try {
    const labels = await gh.pages(`/repos/${repoPath(repo)}/issues/${pr}/labels?per_page=100`);
    names = labels.map((label) => label.name ?? "");
  } catch {
    return { decision: "dispatch", reason: `labels of pull request ${pr} could not be read; running E2E` };
  }
  if (names.includes("E2E/Override"))
    return { decision: "skip", reason: `E2E/Override is set on pull request ${pr}` };
  if (!pathsJson.trim()) return { decision: "dispatch", reason: "the path list is empty; running E2E" };
  let files;
  try {
    files = await gh.pages(`/repos/${repoPath(repo)}/pulls/${pr}/files?per_page=100`);
  } catch {
    return { decision: "dispatch", reason: `the file list of pull request ${pr} could not be read; running E2E` };
  }
  const listed = files.length;
  if (!/^[0-9]+$/.test(changedFiles) || listed >= 3e3 || listed !== Number(changedFiles)) {
    if (listed >= 3e3)
      return {
        decision: "dispatch",
        reason: `the file list of pull request ${pr} reached the 3000-file API limit; running E2E`
      };
    if (/^[0-9]+$/.test(changedFiles))
      return {
        decision: "dispatch",
        reason: `the file list of pull request ${pr} lists ${listed} of ${changedFiles} changed files; running E2E`
      };
    return {
      decision: "dispatch",
      reason: `the file list of pull request ${pr} could not be checked against its changed files; running E2E`
    };
  }
  const tsv = files.map((file) => `${file.filename ?? ""}	${file.previous_filename ?? ""}`).join("\n");
  const result = impact(pathsJson, tsv);
  if (result === "miss") return { decision: "skip", reason: `pull request ${pr} has no app-impacting files` };
  if (result === "hit") return { decision: "dispatch", reason: `pull request ${pr} changes app-impacting files` };
  return { decision: "dispatch", reason: "the impact filter failed; running E2E" };
}
async function skipBlocker(gh, repo, pr, sha) {
  let pulls;
  try {
    pulls = await gh.pages(`/repos/${repoPath(repo)}/commits/${sha}/pulls?per_page=100`);
  } catch {
    return `the pull requests of ${sha} could not be read; running E2E`;
  }
  const heads = pulls.filter((pull) => pull.state === "open" && pull.head?.sha === sha && pull.number != null).map((pull) => String(pull.number));
  if (!heads.includes(pr)) return `pull request ${pr} moved off ${sha} while its files were read; running E2E`;
  const others = heads.filter((number) => number !== pr);
  if (others.length > 0) return `${sha} is also the head of pull request ${others.join(", ")}; running E2E`;
  return void 0;
}
function cleanLanes(raw) {
  const seen = /* @__PURE__ */ new Set();
  const lanes = [];
  for (const name of raw.split(",")) {
    if (!name) continue;
    if (!isLane(name)) return { lanes: "", error: `unknown lane ${name}` };
    if (!seen.has(name)) {
      seen.add(name);
      lanes.push(name);
    }
  }
  if (lanes.length === 0) return { lanes: "", error: "lanes names no lane" };
  return { lanes: lanes.join(",") };
}
function isLane(name) {
  return LANES.includes(name);
}
function firstBadLane(raw) {
  for (const name of raw.split(",")) {
    if (!isLane(name)) return name;
  }
  return void 0;
}
function repoPath(repo) {
  const [owner, name] = repo.split("/");
  if (!owner || !name || repo.split("/").length !== 2)
    throw new Error("refusing to call GitHub without a repository");
  return `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

// src/run.ts
var ActionError = class extends Error {
};
ActionError.prototype.name = "ActionError";
async function run(name, env) {
  const io = runnerIo(env);
  const gh = github(envValue(env, "GH_TOKEN"));
  switch (name) {
    case "decide":
      return decide(env, gh, io);
    case "start":
      return start(env, gh, io);
    case "statuses":
      return statuses(env, gh, io);
    default:
      throw new ActionError(`no action ${JSON.stringify(name ?? "")}; the bundle runs decide, start, statuses`);
  }
}

// src/index.ts
function fail(e) {
  if (e instanceof Halt) {
    process.exitCode = e.code;
    return;
  }
  const message = e instanceof ActionError || e instanceof Error ? e.message : String(e);
  console.error(`::error::${message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}`);
  process.exitCode = 1;
}
run(process.argv[2], process.env).catch(fail);
