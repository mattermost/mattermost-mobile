/** hit when a changed path is app-impacting, miss when none is, error when the inputs cannot be read. */
export type Impact = "hit" | "miss" | "error";

/** Globs from the paths document it is given. A directory entry matches its children. */
export function globs(doc: {
    fingerprintShared?: unknown;
    fingerprintByPlatform?: unknown;
    triggerExtra?: unknown;
}): string[] {
    const pats: string[] = [];
    const toGlob = (entry: unknown): string => {
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
    const seen = new Set<string>();
    const out: string[] = [];
    for (const pat of pats) {
        if (!seen.has(pat)) {
            seen.add(pat);
            out.push(pat);
        }
    }
    return out;
}

/** One glob as a full-string matcher. ** crosses directories; * stays inside one. */
export function compileGlob(pattern: string): RegExp {
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

/** Whether any changed path, or its previous path, matches the paths document. */
export function impact(pathsJson: string, filesTsv: string): Impact {
    try {
        const matchers = globs(JSON.parse(pathsJson) as Parameters<typeof globs>[0]).map(compileGlob);
        for (const line of filesTsv.split("\n")) {
            for (const name of line.replace(/\n$/, "").split("\t")) {
                if (name && matchers.some((matcher) => matcher.test(name))) return "hit";
            }
        }
        return "miss";
    } catch {
        return "error";
    }
}

function asList(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}
