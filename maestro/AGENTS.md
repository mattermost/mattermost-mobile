# Maestro — Agent entrypoint

**Read [GUIDELINES.md](./GUIDELINES.md) before editing any flow.** It is the single authoring spec (header contract, selectors, gotchas, CI, checklist).

Quick rules:

- Use `id:` testIDs only — never `point:` except system overlays with no accessibility node.
- Every flow needs the header block in GUIDELINES §2; run `cd maestro && npm run validate-headers`.
- Start authenticated flows with `runFlow: ../../utils/login.yml`.
- Setup and CI: [README.md](./README.md).

Do not duplicate rules here — update GUIDELINES.md instead.
