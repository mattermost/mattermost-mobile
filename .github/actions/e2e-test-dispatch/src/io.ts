import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";

export type Env = Record<string, string | undefined>;

/** Where the action writes its outputs, summary and annotations. Tests pass a memory one. */
export interface Io {
    output(name: string, value: string): void;
    summary(text: string): void;
    log(line: string): void;
    error(line: string): void;
    notice(line: string): void;
}

/** Stops the command after its outputs are written. A hand run that is refused exits 1. */
export class Halt extends Error {
    readonly code: number;
    constructor(code: number) {
        super("halt");
        this.name = "Halt";
        this.code = code;
    }
}

/** Appends one output in the delimited form, so a value cannot break the next line. */
export function writeOutput(path: string | undefined, name: string, value: string): void {
    if (!path) return;
    const delimiter = `ghadelimiter_${randomUUID()}`;
    appendFileSync(path, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

/** The runner's output file, summary and log. */
export function runnerIo(env: Env): Io {
    return {
        output: (name, value) => writeOutput(env.GITHUB_OUTPUT, name, value),
        summary: (text) => {
            if (env.GITHUB_STEP_SUMMARY)
                appendFileSync(env.GITHUB_STEP_SUMMARY, text.endsWith("\n") ? text : `${text}\n`);
        },
        log: (line) => console.log(line),
        error: (line) => console.error(`::error::${line}`),
        notice: (line) => console.log(`::notice::${line}`),
    };
}

export const envValue = (env: Env, key: string): string => env[key] ?? "";
