import { GitHubError } from "./github.ts";
import type { Gh } from "./github.ts";
import { impact } from "./impact.ts";
import { Halt } from "./io.ts";
import type { Env, Io } from "./io.ts";
import { envValue } from "./io.ts";

const LANES = ["detox-ios", "detox-ipad", "detox-android", "maestro-ios", "maestro-android"] as const;
const DEFAULT_LANES = LANES.join(",");
const SHA = /^[0-9a-f]{40}$/;
const PR_NUMBER = /^[1-9][0-9]{0,6}$/;
const TRUSTED = /^(?:main|release-[0-9]+\.[0-9]+)$/;
const REPO_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SERVER_IMAGE =
    /^((docker\.io|index\.docker\.io)\/)?(mattermost|mattermostdevelopment)\/mattermost-enterprise(-fips)?-edition:[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;
const REQUIRED = [
    "e2e-test/detox-ios",
    "e2e-test/detox-android",
    "e2e-test/detox-ipad",
    "e2e-test/maestro-ios",
    "e2e-test/maestro-android",
] as const;

interface Pull {
    number?: number;
    state?: string;
    changed_files?: number | null;
    head?: { sha?: string; ref?: string; repo?: { full_name?: string | null } | null };
    base?: { ref?: string };
}

/** Decides whether this ci result starts E2E Tests. A refusal of a hand run exits 1. */
export async function decide(env: Env, gh: Gh, io: Io): Promise<void> {
    const event = envValue(env, "EVENT");
    const dryRun = envValue(env, "DRY_RUN") === "true";
    const enabled = envValue(env, "ENABLED") === "true";
    const repo = envValue(env, "REPO");

    const hand = event === "workflow_dispatch";
    let sha: string;
    let pr: string;
    let lanes: string;
    let account: string;
    let channel: string;
    let server: string;
    let image: string;
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
            true,
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
                true,
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
                false,
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
                    false,
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
                    false,
                );
        }
    }

    let changedFiles = "";
    if (pr) {
        let pull: Pull;
        try {
            pull = (await gh.json(`/repos/${repoPath(repo)}/pulls/${pr}`)) as Pull;
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
                hand,
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
                hand,
            );
        ref = base;
        changedFiles = pull.changed_files == null ? "" : String(pull.changed_files);
    }
    if (fork)
        return finish(
            io,
            event,
            dryRun,
            "refuse",
            `pull request ${pr} is from a fork; E2E Tests do not run a fork pull request`,
            hand,
        );

    if (hand) {
        const body = (await gh.json(
            `/repos/${repoPath(repo)}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=1`,
        )) as { workflow_runs?: { status?: string | null; conclusion?: string | null }[] };
        const run = body.workflow_runs?.[0];
        if (!run) return finish(io, event, dryRun, "refuse", `commit ${sha} has no ci run`, true);
        const status = run.status == null ? "null" : String(run.status);
        const conclusion = run.conclusion == null ? "" : String(run.conclusion);
        if (status !== "completed" || conclusion !== "success")
            return finish(io, event, dryRun, "refuse", `ci for ${sha} is ${status}/${conclusion}, not success`, true);
    }

    let decision: "dispatch" | "skip" = "dispatch";
    let reason: string;
    if (pr) {
        const filtered = await filterPullRequest(gh, repo, pr, envValue(env, "PATHS"), changedFiles);
        decision = filtered.decision;
        reason = filtered.reason;
    } else {
        reason = `ci passed on ${ref}`;
    }

    const start = decision === "dispatch" && !dryRun;
    const post = decision === "skip" && enabled && !dryRun && pr !== "";
    io.output("decision", decision);
    io.output("reason", reason);
    io.output("start", String(start));
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
    io.summary(`${lines.join("\n")}\n`);
}

/** Starts e2e-test-ci.yml on the decided ref. Every value is checked again before the dispatch. */
export async function start(env: Env, gh: Gh, io: Io): Promise<void> {
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
    if (bad !== undefined) return refuseStart(io, `refusing lane ${bad}`);
    if (image && !SERVER_IMAGE.test(image)) return refuseStart(io, "refusing server image");

    const inputs: Record<string, string> = {
        commit_sha: sha,
        lanes,
        e2e_test_stack_account: account,
        e2e_test_stack_channel: channel,
        e2e_test_stack_server: server,
    };
    if (pr) inputs.pr_number = pr;
    if (image) inputs.e2e_test_stack_server_image = image;
    await gh.post(`/repos/${repoPath(repo)}/actions/workflows/e2e-test-ci.yml/dispatches`, { ref, inputs });
    io.log(`Dispatched E2E Tests on ${ref} for ${sha}`);
}

/** Posts a success on each required e2e-test/* context when a same-repo pull request was skipped. */
export async function statuses(env: Env, gh: Gh, io: Io): Promise<void> {
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
    const description = reason.includes("E2E/Override")
        ? "E2E tests skipped — E2E/Override"
        : "E2E tests skipped — no app-impacting changes";
    for (const context of REQUIRED) {
        await gh.post(`/repos/${repoPath(repo)}/statuses/${sha}`, {
            state: "success",
            context,
            description,
            target_url: url,
        });
        io.log(`${context}: success (${description})`);
    }
}

function refuseStart(io: Io, reason: string): never {
    io.error(reason);
    throw new Halt(1);
}

function finish(io: Io, event: string, dryRun: boolean, decision: "refuse", reason: string, fail: boolean): never {
    io.output("decision", decision);
    io.output("reason", reason);
    io.log(`${decision}: ${reason}`);
    const lines = ["### E2E Tests Dispatch", "", `- Decision: \`${decision}\``, `- ${reason}`];
    if (dryRun) lines.push("- Dry run: nothing dispatched");
    io.summary(`${lines.join("\n")}\n`);
    if (fail && event === "workflow_dispatch") {
        io.error(reason);
        throw new Halt(1);
    }
    io.notice(reason);
    throw new Halt(0);
}

async function pullsFor(gh: Gh, repo: string, sha: string, io: Io, event: string, dryRun: boolean): Promise<Pull[]> {
    try {
        const pulls = await gh.json(`/repos/${repoPath(repo)}/commits/${sha}/pulls`);
        if (!Array.isArray(pulls)) throw new GitHubError(0, "pulls response was not a list");
        return pulls as Pull[];
    } catch (e) {
        if (!(e instanceof GitHubError)) throw e;
        finish(io, event, dryRun, "refuse", `could not list pull requests for ${sha}`, false);
    }
}

/** The lowest numbered open pull request into a trusted base whose head is still this commit and repository. */
function pick(pulls: Pull[], repo: string, sha: string, branch: string): string {
    const matches = pulls
        .filter(
            (pull) =>
                pull.state === "open" &&
                pull.head?.sha === sha &&
                pull.head?.ref === branch &&
                (pull.head?.repo?.full_name ?? "") === repo &&
                TRUSTED.test(pull.base?.ref ?? ""),
        )
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const number = matches[0]?.number;
    return number == null ? "" : String(number);
}

/** The first pull request on the ci payload whose head is still this commit. */
function pickFromEvent(raw: string, sha: string, branch: string): string {
    if (!raw) return "";
    const pulls = JSON.parse(raw) as unknown;
    if (!Array.isArray(pulls)) return "";
    for (const pull of pulls as Pull[]) {
        if (pull?.head?.sha === sha && pull.head?.ref === branch && pull.number != null) return String(pull.number);
    }
    return "";
}

async function filterPullRequest(
    gh: Gh,
    repo: string,
    pr: string,
    pathsJson: string,
    changedFiles: string,
): Promise<{ decision: "dispatch" | "skip"; reason: string }> {
    let names: string[];
    try {
        const labels = (await gh.pages(`/repos/${repoPath(repo)}/issues/${pr}/labels?per_page=100`)) as {
            name?: string;
        }[];
        names = labels.map((label) => label.name ?? "");
    } catch (e) {
        if (!(e instanceof GitHubError)) throw e;
        return { decision: "dispatch", reason: `labels of pull request ${pr} could not be read; running E2E` };
    }
    if (names.includes("E2E/Override"))
        return { decision: "skip", reason: `E2E/Override is set on pull request ${pr}` };
    if (!pathsJson.trim()) return { decision: "dispatch", reason: "the path list is empty; running E2E" };

    let files: { filename?: string; previous_filename?: string | null }[];
    try {
        files = (await gh.pages(`/repos/${repoPath(repo)}/pulls/${pr}/files?per_page=100`)) as {
            filename?: string;
            previous_filename?: string | null;
        }[];
    } catch (e) {
        if (!(e instanceof GitHubError)) throw e;
        return { decision: "dispatch", reason: `the file list of pull request ${pr} could not be read; running E2E` };
    }

    const listed = files.length;
    if (!/^[0-9]+$/.test(changedFiles) || listed >= 3000 || listed !== Number(changedFiles)) {
        if (listed >= 3000)
            return {
                decision: "dispatch",
                reason: `the file list of pull request ${pr} reached the 3000-file API limit; running E2E`,
            };
        if (/^[0-9]+$/.test(changedFiles))
            return {
                decision: "dispatch",
                reason: `the file list of pull request ${pr} lists ${listed} of ${changedFiles} changed files; running E2E`,
            };
        return {
            decision: "dispatch",
            reason: `the file list of pull request ${pr} could not be checked against its changed files; running E2E`,
        };
    }

    const tsv = files.map((file) => `${file.filename ?? ""}\t${file.previous_filename ?? ""}`).join("\n");
    const result = impact(pathsJson, tsv);
    if (result === "miss") return { decision: "skip", reason: `pull request ${pr} has no app-impacting files` };
    if (result === "hit") return { decision: "dispatch", reason: `pull request ${pr} changes app-impacting files` };
    return { decision: "dispatch", reason: "the impact filter failed; running E2E" };
}

function cleanLanes(raw: string): { lanes: string; error?: string } {
    const seen = new Set<string>();
    const lanes: string[] = [];
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

function isLane(name: string): name is (typeof LANES)[number] {
    return (LANES as readonly string[]).includes(name);
}

/** The first lane token start should refuse, including an empty one from a trailing comma. */
function firstBadLane(raw: string): string | undefined {
    for (const name of raw.split(",")) {
        if (!isLane(name)) return name;
    }
    return undefined;
}

function repoPath(repo: string): string {
    const [owner, name] = repo.split("/");
    if (!owner || !name || repo.split("/").length !== 2)
        throw new Error("refusing to call GitHub without a repository");
    return `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}
