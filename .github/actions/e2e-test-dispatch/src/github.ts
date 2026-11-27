/** One GitHub REST call. Paths are absolute API paths, or a full URL when a page link says so. */
export interface Gh {
    json(path: string): Promise<unknown>;
    text(path: string): Promise<string>;
    pages(path: string): Promise<unknown[]>;
    post(path: string, body: unknown): Promise<void>;
}

/** A GitHub response that was not a success. Callers choose whether that refuses the run or dispatches it. */
export class GitHubError extends Error {
    readonly status: number;
    constructor(status: number, message: string) {
        super(message);
        this.name = "GitHubError";
        this.status = status;
    }
}

const API = "https://api.github.com";

/** The next page URL from a Link header, if GitHub sent one. */
export function nextLink(header: string | null): string | undefined {
    if (!header) return undefined;
    for (const part of header.split(",")) {
        const match = part.match(/<([^>]+)>;\s*rel="next"/);
        if (match) return match[1];
    }
    return undefined;
}

/** A REST client for api.github.com. A non-success response throws GitHubError. */
export function github(token: string, fetchImpl: typeof fetch = fetch): Gh {
    const send = async (path: string, init: RequestInit, accept: string): Promise<Response> => {
        const url = path.startsWith("https://") ? path : `${API}${path}`;
        const res = await fetchImpl(url, {
            ...init,
            headers: {
                authorization: `Bearer ${token}`,
                accept,
                "content-type": "application/json",
                "user-agent": "mattermost-e2e-test-dispatch",
                ...(init.headers ?? {}),
            },
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
                (res) => res.json() as Promise<unknown>,
            );
        },
        async text(path) {
            return send(path, { method: "GET" }, "application/vnd.github.raw").then((res) => res.text());
        },
        async pages(path) {
            const items: unknown[] = [];
            let next: string | undefined = path;
            while (next) {
                const res = await send(next, { method: "GET" }, "application/vnd.github+json");
                const body: unknown = await res.json();
                if (!Array.isArray(body)) throw new GitHubError(0, `GitHub GET ${next}: expected a list`);
                const page: readonly unknown[] = body;
                items.push(...page);
                next = nextLink(res.headers.get("link"));
            }
            return items;
        },
        async post(path, body) {
            await send(path, { method: "POST", body: JSON.stringify(body) }, "application/vnd.github+json");
        },
    };
}
