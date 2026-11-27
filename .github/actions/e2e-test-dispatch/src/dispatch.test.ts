import assert from "node:assert/strict";
import { test } from "node:test";
import { decide, start, statuses } from "./dispatch.ts";
import type { Gh } from "./github.ts";
import { Halt } from "./io.ts";
import type { Env, Io } from "./io.ts";

const SHA = "a".repeat(40);
const paths = JSON.stringify({ fingerprintShared: ["app/"], fingerprintByPlatform: {}, triggerExtra: [] });

function io(): Io & { outputs: Record<string, string>; errors: string[]; notices: string[] } {
    const outputs: Record<string, string> = {};
    const errors: string[] = [];
    const notices: string[] = [];
    return {
        outputs,
        errors,
        notices,
        output: (name, value) => {
            outputs[name] = value;
        },
        summary: () => undefined,
        log: () => undefined,
        error: (line) => errors.push(line),
        notice: (line) => notices.push(line),
    };
}

function client(routes: {
    json?: (path: string) => unknown;
    text?: (path: string) => string;
    pages?: (path: string) => unknown[];
    post?: (path: string, body: unknown) => void;
}): Gh & { posts: { path: string; body: unknown }[] } {
    const posts: { path: string; body: unknown }[] = [];
    return {
        posts,
        json: async (path) => {
            if (!routes.json) throw new Error(`unexpected json ${path}`);
            return routes.json(path);
        },
        text: async (path) => {
            if (!routes.text) throw new Error(`unexpected text ${path}`);
            return routes.text(path);
        },
        pages: async (path) => {
            if (!routes.pages) throw new Error(`unexpected pages ${path}`);
            return routes.pages(path);
        },
        post: async (path, body) => {
            posts.push({ path, body });
            routes.post?.(path, body);
        },
    };
}

const hand = (over: Env = {}): Env => ({
    EVENT: "workflow_dispatch",
    DRY_RUN: "false",
    ENABLED: "false",
    REPO: "mattermost/mattermost-mobile",
    DISPATCH_REF: "main",
    INPUT_SHA: SHA,
    INPUT_PR: "",
    INPUT_LANES: "detox-ios",
    INPUT_ACCOUNT: "prod",
    INPUT_CHANNEL: "v1",
    INPUT_SERVER: "master",
    INPUT_IMAGE: "",
    ...over,
});

test("a hand run with a bad sha is refused and fails the job", async () => {
    const out = io();
    await assert.rejects(
        () => decide(hand({ INPUT_SHA: "nope" }), client({}), out),
        (e: unknown) => e instanceof Halt && e.code === 1,
    );
    assert.equal(out.outputs.decision, "refuse");
    assert.deepEqual(out.errors, ["commit_sha must be a full 40-character SHA"]);
    assert.deepEqual(out.notices, []);
});

test("a fork pull request dispatches only the Detox lanes and skips the path filter", async () => {
    const out = io();
    const pull = {
        number: 9,
        state: "open",
        changed_files: 1,
        head: { sha: SHA, ref: "fork-branch", repo: { full_name: "someone/mattermost-mobile" } },
        base: { ref: "main" },
    };
    const gh = client({
        json: (path) => (path.includes("/commits/") ? [pull] : pull),
    });
    await decide(
        {
            EVENT: "workflow_run",
            DRY_RUN: "false",
            ENABLED: "false",
            REPO: "mattermost/mattermost-mobile",
            RUN_SHA: SHA,
            RUN_BRANCH: "fork-branch",
            RUN_REPO: "someone/mattermost-mobile",
            RUN_EVENT: "pull_request",
            RUN_PRS: JSON.stringify([{ number: 9, head: { sha: SHA, ref: "fork-branch" } }]),
        },
        gh,
        out,
    );
    assert.equal(out.outputs.decision, "dispatch");
    assert.equal(out.outputs.pr, "9");
    assert.equal(out.outputs.start, "true");
    assert.equal(out.outputs.lanes, "detox-ios,detox-ipad,detox-android");
    assert.match(out.outputs.reason, /from a fork/);
});

test("a hand run of only Maestro lanes for a fork pull request is refused", async () => {
    const out = io();
    const pull = {
        number: 9,
        state: "open",
        changed_files: 1,
        head: { sha: SHA, ref: "fork-branch", repo: { full_name: "someone/mattermost-mobile" } },
        base: { ref: "main" },
    };
    await assert.rejects(
        () =>
            decide(
                hand({ INPUT_PR: "9", INPUT_LANES: "maestro-ios,maestro-android" }),
                client({ json: () => pull }),
                out,
            ),
        (e: unknown) => e instanceof Halt && e.code === 1,
    );
    assert.equal(out.outputs.decision, "refuse");
    assert.equal(out.outputs.start, undefined);
    assert.match(out.outputs.reason, /only the Detox lanes/);
});

test("E2E/Override skips and asks for the required statuses only when the variable is on", async () => {
    const pull = {
        state: "open",
        changed_files: 1,
        head: { sha: SHA, ref: "branch", repo: { full_name: "mattermost/mattermost-mobile" } },
        base: { ref: "main" },
    };
    const gh = client({
        json: () => pull,
        pages: (path) => (path.includes("/commits/") ? [{ ...pull, number: 12 }] : [{ name: "E2E/Override" }]),
    });
    const skipped = io();
    await decide(
        {
            EVENT: "workflow_run",
            DRY_RUN: "false",
            ENABLED: "true",
            REPO: "mattermost/mattermost-mobile",
            RUN_SHA: SHA,
            RUN_BRANCH: "branch",
            RUN_REPO: "mattermost/mattermost-mobile",
            RUN_EVENT: "pull_request",
            RUN_PRS: JSON.stringify([{ number: 12, head: { sha: SHA, ref: "branch" } }]),
        },
        gh,
        skipped,
    );
    assert.equal(skipped.outputs.decision, "skip");
    assert.equal(skipped.outputs.post, "true");
    assert.equal(skipped.outputs.start, "false");
});

test("a documentation-only pull request skips, and a short file list does not", async () => {
    const base = {
        EVENT: "workflow_run",
        DRY_RUN: "false",
        ENABLED: "true",
        REPO: "mattermost/mattermost-mobile",
        RUN_SHA: SHA,
        RUN_BRANCH: "branch",
        RUN_REPO: "mattermost/mattermost-mobile",
        RUN_EVENT: "pull_request",
        RUN_PRS: JSON.stringify([{ number: 4, head: { sha: SHA, ref: "branch" } }]),
        PATHS: paths,
    };
    const pull = {
        state: "open",
        changed_files: 1,
        head: { sha: SHA, ref: "branch", repo: { full_name: "mattermost/mattermost-mobile" } },
        base: { ref: "main" },
    };
    const docsOnly = (heads: unknown[] | Error) =>
        client({
            json: () => pull,
            pages: (path) => {
                if (path.includes("/labels")) return [];
                if (path.includes("/commits/")) {
                    if (heads instanceof Error) throw heads;
                    return heads;
                }
                return [{ filename: "docs/readme.md", previous_filename: null }];
            },
        });

    const miss = io();
    await decide(base, docsOnly([{ ...pull, number: 4 }]), miss);
    assert.equal(miss.outputs.decision, "skip");
    assert.match(miss.outputs.reason, /no app-impacting files/);

    const shared = io();
    await decide(
        base,
        docsOnly([
            { ...pull, number: 4 },
            { ...pull, number: 7, base: { ref: "release-2.47" } },
        ]),
        shared,
    );
    assert.equal(shared.outputs.decision, "dispatch");
    assert.match(shared.outputs.reason, /also the head of pull request 7/);

    const moved = io();
    await decide(base, docsOnly([{ ...pull, number: 4, head: { ...pull.head, sha: "b".repeat(40) } }]), moved);
    assert.equal(moved.outputs.decision, "dispatch");
    assert.match(moved.outputs.reason, /moved off/);

    const unread = io();
    await decide(base, docsOnly(new TypeError("fetch failed")), unread);
    assert.equal(unread.outputs.decision, "dispatch");
    assert.match(unread.outputs.reason, /could not be read/);

    const offline = io();
    await decide(
        base,
        client({
            json: () => pull,
            pages: () => {
                throw new TypeError("fetch failed");
            },
        }),
        offline,
    );
    assert.equal(offline.outputs.decision, "dispatch");
    assert.match(offline.outputs.reason, /labels of pull request 4 could not be read/);

    const short = io();
    await decide(
        base,
        client({
            json: () => ({ ...pull, changed_files: 2 }),
            pages: (path) => (path.includes("/labels") ? [] : [{ filename: "docs/readme.md" }]),
        }),
        short,
    );
    assert.equal(short.outputs.decision, "dispatch");
    assert.match(short.outputs.reason, /lists 1 of 2/);
});

test("start posts the workflow dispatch and statuses posts the five required contexts", async () => {
    const gh = client({});
    const out = io();
    await start(
        {
            REF: "main",
            SHA,
            PR: "4",
            LANES: "detox-ios,detox-android",
            ACCOUNT: "prod",
            CHANNEL: "v1",
            SERVER: "master",
            IMAGE: "",
            GH_REPO: "mattermost/mattermost-mobile",
        },
        gh,
        out,
    );
    assert.equal(gh.posts.length, 1);
    assert.match(gh.posts[0].path, /e2e-test-ci\.yml\/dispatches$/);
    const body = gh.posts[0].body as { ref: string; inputs: Record<string, string> };
    assert.equal(body.ref, "main");
    assert.equal(body.inputs.commit_sha, SHA);
    assert.equal(body.inputs.pr_number, "4");
    assert.equal(body.inputs.e2e_test_stack_server_image, undefined);

    gh.posts.length = 0;
    await statuses(
        {
            PR: "4",
            SHA,
            REASON: "E2E/Override is set on pull request 4",
            REPO: "mattermost/mattermost-mobile",
            URL: "https://example.test/run",
        },
        gh,
        out,
    );
    assert.equal(gh.posts.length, 5);
    assert.equal((gh.posts[0].body as { description: string }).description, "E2E tests skipped — E2E/Override");
    assert.deepEqual(
        gh.posts.map((post) => (post.body as { context: string }).context),
        [
            "e2e-test/detox-ios",
            "e2e-test/detox-android",
            "e2e-test/detox-ipad",
            "e2e-test/maestro-ios",
            "e2e-test/maestro-android",
        ],
    );
});

test("an empty path list still dispatches", async () => {
    const out = io();
    await decide(
        {
            EVENT: "workflow_run",
            DRY_RUN: "true",
            ENABLED: "true",
            REPO: "mattermost/mattermost-mobile",
            RUN_SHA: SHA,
            RUN_BRANCH: "branch",
            RUN_REPO: "mattermost/mattermost-mobile",
            RUN_EVENT: "pull_request",
            RUN_PRS: JSON.stringify([{ number: 4, head: { sha: SHA, ref: "branch" } }]),
            PATHS: "",
        },
        client({
            json: () => ({
                state: "open",
                changed_files: 1,
                head: { sha: SHA, ref: "branch", repo: { full_name: "mattermost/mattermost-mobile" } },
                base: { ref: "main" },
            }),
            pages: () => [],
        }),
        out,
    );
    assert.equal(out.outputs.decision, "dispatch");
    assert.equal(out.outputs.start, "false");
    assert.match(out.outputs.reason, /path list is empty/);
});
