#!/usr/bin/env python3
"""Split multi-it Detox e2e specs into one file per it()."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DETOX = ROOT / "detox"

EXCLUDE_SUBSTR = (
    "interactive_dialog",
    "classification_banner",
    "global_classification_banner",
    "ci_filter_failed",
)


def find_matching(text: str, open_idx: int) -> int:
    """Return index of closing brace/paren matching text[open_idx]."""
    open_ch = text[open_idx]
    close_ch = {"(": ")", "{": "}", "[": "]"}[open_ch]
    depth = 0
    i = open_idx
    in_squote = in_dquote = in_backtick = False
    in_line_comment = in_block_comment = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""

        if in_line_comment:
            if ch == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if ch == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue

        if in_squote:
            if ch == "\\" and nxt:
                i += 2
                continue
            if ch == "'":
                in_squote = False
            i += 1
            continue
        if in_dquote:
            if ch == "\\" and nxt:
                i += 2
                continue
            if ch == '"':
                in_dquote = False
            i += 1
            continue
        if in_backtick:
            if ch == "\\" and nxt:
                i += 2
                continue
            if ch == "`":
                in_backtick = False
            i += 1
            continue

        if ch == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if ch == "'":
            in_squote = True
            i += 1
            continue
        if ch == '"':
            in_dquote = True
            i += 1
            continue
        if ch == "`":
            in_backtick = True
            i += 1
            continue

        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError(f"Unbalanced {open_ch} starting at {open_idx}")


def extract_string_literal(text: str, start: int) -> tuple[str, int]:
    """Extract a JS string/template literal starting at start; return (value, end_exclusive)."""
    quote = text[start]
    if quote not in "'\"`":
        raise ValueError(f"Expected string at {start}")
    i = start + 1
    out = []
    while i < len(text):
        ch = text[i]
        if ch == "\\" and i + 1 < len(text):
            out.append(text[i + 1])
            i += 2
            continue
        if ch == quote:
            return "".join(out), i + 1
        out.append(ch)
        i += 1
    raise ValueError("Unterminated string")


def skip_ws_and_comments(text: str, i: int) -> int:
    while i < len(text):
        if text[i] in " \t\r\n":
            i += 1
            continue
        if text.startswith("//", i):
            nl = text.find("\n", i)
            i = len(text) if nl < 0 else nl + 1
            continue
        if text.startswith("/*", i):
            end = text.find("*/", i + 2)
            i = len(text) if end < 0 else end + 2
            continue
        break
    return i


def collect_it_aliases(text: str) -> set[str]:
    """Find identifiers bound to it / it.skip / ternary of those."""
    aliases = {"it"}
    # const foo = hasX ? it : it.skip;
    for m in re.finditer(
        r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*"
        r"(?:[^;\n]*\b(?:it(?:\.(?:skip|only))?)\b[^;\n]*);",
        text,
    ):
        rhs = m.group(0).split("=", 1)[1]
        if re.search(r"\bit(?:\.(?:skip|only))?\b", rhs):
            aliases.add(m.group(1))
    return aliases


def brace_depth_at(text: str, pos: int) -> int:
    """Brace depth for code before pos (strings/comments ignored)."""
    depth = 0
    in_s = in_d = in_b = False
    in_lc = in_bc = False
    i = 0
    while i < pos:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if in_lc:
            if ch == "\n":
                in_lc = False
            i += 1
            continue
        if in_bc:
            if ch == "*" and nxt == "/":
                in_bc = False
                i += 2
                continue
            i += 1
            continue
        if in_s:
            if ch == "\\" and nxt:
                i += 2
                continue
            if ch == "'":
                in_s = False
            i += 1
            continue
        if in_d:
            if ch == "\\" and nxt:
                i += 2
                continue
            if ch == '"':
                in_d = False
            i += 1
            continue
        if in_b:
            if ch == "\\" and nxt:
                i += 2
                continue
            if ch == "`":
                in_b = False
            i += 1
            continue
        if ch == "/" and nxt == "/":
            in_lc = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            in_bc = True
            i += 2
            continue
        if ch == "'":
            in_s = True
            i += 1
            continue
        if ch == '"':
            in_d = True
            i += 1
            continue
        if ch == "`":
            in_b = True
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1
    return depth


def looks_like_it_callee(expr: str, names: set[str]) -> bool:
    """True if a parenthesized callee expression resolves to it/it.skip/alias."""
    if re.search(r"\bit(?:\.(?:skip|only))?\b", expr):
        return True
    for n in names:
        if n == "it":
            continue
        if re.search(rf"\b{re.escape(n)}\b", expr):
            return True
    return False


def find_top_level_calls(body: str, names: set[str]) -> list[tuple[int, int, str, str]]:
    """
    Find top-level test calls inside describe body.
    Handles: it(, it.skip(, alias(, and (cond ? it.skip : it)(.
    Returns list of (start, end_exclusive, name, title).
    """
    results: list[tuple[int, int, str, str]] = []
    name_alt = "|".join(re.escape(n) for n in sorted(names, key=len, reverse=True))
    # Direct: it( / it.skip( / alias(
    direct = re.compile(
        rf"(?m)^([ \t]*)({name_alt})(?:\.(skip|only))?\s*\("
    )
    # Parenthesized callee: (isAndroid() ? it.skip : it)(
    wrapped = re.compile(r"(?m)^([ \t]*)\(")

    seen_starts: set[int] = set()

    def add_call(start: int, args_open: int, call_name: str) -> None:
        if start in seen_starts:
            return
        if brace_depth_at(body, start) != 0:
            return
        paren_close = find_matching(body, args_open)
        end = paren_close + 1
        j = skip_ws_and_comments(body, end)
        if j < len(body) and body[j] == ";":
            end = j + 1
        arg_start = skip_ws_and_comments(body, args_open + 1)
        title = ""
        if arg_start < len(body) and body[arg_start] in "'\"`":
            title, _ = extract_string_literal(body, arg_start)
        if not title:
            return
        seen_starts.add(start)
        results.append((start, end, call_name, title))

    for m in direct.finditer(body):
        add_call(m.start(), m.end() - 1, m.group(2))

    for m in wrapped.finditer(body):
        open_paren = m.end() - 1
        try:
            close_paren = find_matching(body, open_paren)
        except ValueError:
            continue
        expr = body[open_paren : close_paren + 1]
        if not looks_like_it_callee(expr, names):
            continue
        after = skip_ws_and_comments(body, close_paren + 1)
        if after >= len(body) or body[after] != "(":
            continue
        # Require first arg to be a string title (test call, not a random IIFE)
        arg_start = skip_ws_and_comments(body, after + 1)
        if arg_start >= len(body) or body[arg_start] not in "'\"`":
            continue
        title, _ = extract_string_literal(body, arg_start)
        if not title:
            continue
        add_call(m.start(), after, expr)

    results.sort(key=lambda t: t[0])
    return results


def title_to_filename(title: str, fallback_idx: int) -> str:
    m = re.match(r"(MM-T[\w]+)", title.strip(), re.I)
    if m:
        slug = m.group(1).lower().replace("_", "-")
        return f"{slug}.e2e.ts"
    # fallback
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60] or f"test-{fallback_idx}"
    return f"{slug}.e2e.ts"


def split_file(src: Path, dry_run: bool = False) -> list[Path]:
    text = src.read_text()
    aliases = collect_it_aliases(text)

    desc_m = re.search(r"(?m)^describe\s*\(", text)
    if not desc_m:
        raise ValueError(f"No describe() in {src}")

    preamble = text[: desc_m.start()]
    # describe('name', () => { ... });
    desc_paren_open = desc_m.end() - 1
    desc_paren_close = find_matching(text, desc_paren_open)
    desc_call = text[desc_m.start() : desc_paren_close + 1]
    # trailing ;
    after = desc_paren_close + 1
    j = skip_ws_and_comments(text, after)
    if j < len(text) and text[j] == ";":
        after = j + 1
    trailing = text[after:]  # usually newline/eof

    # extract describe title
    arg0 = skip_ws_and_comments(text, desc_paren_open + 1)
    describe_title, after_title = extract_string_literal(text, arg0)
    # find arrow/function body `{`
    rest = skip_ws_and_comments(text, after_title)
    if text[rest] != ",":
        raise ValueError(f"Expected comma after describe title in {src}")
    rest = skip_ws_and_comments(text, rest + 1)
    # async () => {  or  () => {
    brace = text.find("{", rest)
    if brace < 0 or brace > desc_paren_close:
        raise ValueError(f"No describe body in {src}")
    body_close = find_matching(text, brace)
    body = text[brace + 1 : body_close]

    tests = find_top_level_calls(body, aliases)
    # Filter out hooks mistaken as aliases — hooks are not in aliases unless someone named weirdly
    hooks = {"beforeAll", "beforeEach", "afterAll", "afterEach"}
    tests = [t for t in tests if t[2] not in hooks]

    if len(tests) <= 1:
        return []

    # Build shared body = body with test ranges removed (replaced by blank markers)
    # Keep relative order by reconstructing: shared segments between tests
    shared_parts: list[str] = []
    cursor = 0
    for start, end, _, _ in tests:
        shared_parts.append(body[cursor:start])
        cursor = end
    shared_parts.append(body[cursor:])
    shared_body = "".join(shared_parts)
    # tidy excessive blank lines
    shared_body = re.sub(r"\n{3,}", "\n\n", shared_body)

    out_paths: list[Path] = []
    used_names: dict[str, int] = {}
    for idx, (start, end, _name, title) in enumerate(tests, 1):
        test_src = body[start:end].rstrip() + "\n"
        fname = title_to_filename(title, idx)
        if fname in used_names:
            used_names[fname] += 1
            stem = fname[: -len(".e2e.ts")]
            fname = f"{stem}-{used_names[fname]}.e2e.ts"
        else:
            used_names[fname] = 1

        out_path = src.parent / fname
        # Cross-file MM-T id collision (another suite already wrote this name).
        if out_path.exists() and out_path.resolve() != src.resolve():
            stem = fname[: -len(".e2e.ts")]
            out_path = src.parent / f"{src.stem}-{stem}.e2e.ts"
            n = 2
            while out_path.exists():
                out_path = src.parent / f"{src.stem}-{stem}-{n}.e2e.ts"
                n += 1

        orig_quote = text[arg0]
        describe_line = f"describe({orig_quote}{describe_title}{orig_quote}, () => {{\n"
        new_text = preamble + describe_line + shared_body.rstrip()
        if shared_body.strip():
            new_text += "\n\n"
        else:
            new_text += "\n"
        new_text += test_src
        if not new_text.endswith("\n"):
            new_text += "\n"
        new_text += "});\n"
        if trailing.strip():
            new_text += trailing if trailing.startswith("\n") else "\n" + trailing

        out_paths.append(out_path)
        if dry_run:
            print(f"  WOULD WRITE {out_path.relative_to(ROOT)} ← {title[:80]}")
        else:
            out_path.write_text(new_text)
            print(f"  WRITE {out_path.relative_to(ROOT)} ← {title[:80]}")

    if not dry_run:
        src.unlink()
        print(f"  DELETE {src.relative_to(ROOT)}")
    else:
        print(f"  WOULD DELETE {src.relative_to(ROOT)}")
    return out_paths


def products_from_plan() -> list[Path]:
    plan = (ROOT / "e2e-v2-long-spec-split-plan.md").read_text()
    specs = []
    for m in re.finditer(r"\|\s*\d+\s*\|\s*[^|]+\|\s*\d+\s*\|\s*\w+\s*\|\s*`([^`]+)`", plan):
        rel = m.group(1)
        if any(x in rel for x in EXCLUDE_SUBSTR):
            continue
        specs.append(DETOX / rel)
    # unique preserve order
    seen = set()
    out = []
    for p in specs:
        if p in seen:
            continue
        seen.add(p)
        out.append(p)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--file", action="append", default=[])
    args = ap.parse_args()

    files = [Path(f) if Path(f).is_absolute() else ROOT / f for f in args.file] if args.file else products_from_plan()

    total_written = 0
    skipped = 0
    for src in files:
        if not src.exists():
            print(f"MISSING (already split?) {src.relative_to(ROOT)}")
            skipped += 1
            continue
        print(f"\n== {src.relative_to(ROOT)}")
        try:
            outs = split_file(src, dry_run=args.dry_run)
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)
            return 1
        if not outs:
            print("  SKIP (≤1 test)")
            skipped += 1
        else:
            total_written += len(outs)
    print(f"\nDone: {total_written} files from splits, {skipped} skipped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
