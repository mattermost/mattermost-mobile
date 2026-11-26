import { Halt } from "./io.ts";
import { ActionError, run } from "./run.ts";

function fail(e: unknown): void {
    if (e instanceof Halt) {
        process.exit(e.code);
        return;
    }
    const message = e instanceof ActionError || e instanceof Error ? e.message : String(e);
    console.error(`::error::${message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}`);
    process.exit(1);
}

run(process.argv[2], process.env).then(() => process.exit(0), fail);
