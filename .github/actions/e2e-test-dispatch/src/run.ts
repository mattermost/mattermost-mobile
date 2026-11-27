import { decide, start, statuses } from "./dispatch.ts";
import { github } from "./github.ts";
import type { Env } from "./io.ts";
import { envValue, runnerIo } from "./io.ts";

/** A failure reported on purpose, without a stack. */
export class ActionError extends Error {}
ActionError.prototype.name = "ActionError";

/** Runs the action named, the way its action.yml invokes this bundle. */
export async function run(name: string | undefined, env: Env): Promise<void> {
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
