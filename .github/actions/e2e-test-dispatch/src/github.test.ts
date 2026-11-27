import assert from "node:assert/strict";
import { test } from "node:test";
import { nextLink } from "./github.ts";

test("the next page is the link GitHub marks rel=next", () => {
    assert.equal(nextLink(null), undefined);
    assert.equal(
        nextLink(
            '<https://api.github.com/repos/a/b/pulls/1/files?page=2>; rel="next", <https://api.github.com/repos/a/b/pulls/1/files?page=3>; rel="last"',
        ),
        "https://api.github.com/repos/a/b/pulls/1/files?page=2",
    );
});
