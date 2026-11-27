import assert from "node:assert/strict";
import { test } from "node:test";
import { compileGlob, impact } from "./impact.ts";

const paths = JSON.stringify({
    fingerprintShared: ["app/"],
    fingerprintByPlatform: { ios: ["ios/"] },
    triggerExtra: ["detox/**"],
});

test("a documentation path misses and an app path hits", () => {
    assert.equal(impact(paths, "docs/readme.md\t"), "miss");
    assert.equal(impact(paths, "app/index.ts\t"), "hit");
});

test("a directory glob matches nested files and a previous path counts", () => {
    assert.equal(compileGlob("app/**").test("app/screens/channel.tsx"), true);
    assert.equal(compileGlob("app/**").test("docs/app/index.ts"), false);
    assert.equal(impact(paths, "docs/readme.md\tios/App.tsx"), "hit");
});

test("unreadable paths.json is an error, not a miss", () => {
    assert.equal(impact("{", "app/index.ts"), "error");
});

test("a document with no paths is an error, not a miss", () => {
    assert.equal(impact("{}", "app/index.ts"), "error");
});

test("a path is impacting only when the document lists it", () => {
    assert.equal(impact(JSON.stringify({ triggerExtra: ["detox/**"] }), "docs/readme.md"), "miss");
    assert.equal(
        impact(
            JSON.stringify({ triggerExtra: [".github/actions/compute-e2e-build-fingerprint/**"] }),
            ".github/actions/compute-e2e-build-fingerprint/paths.json",
        ),
        "hit",
    );
});
