---
name: release
description: Prepare and verify a release of opencode-tell-sessions before publishing to npm. Use when asked to release, publish, bump the version, or prepare a new version of this plugin.
argument-hint: "[major|minor|patch]"
---

# Release checklist

Prepare a release of `opencode-tell-sessions` for npm. Run every step in
order; stop and fix on any failure.

## 1. Verify the working tree

```bash
git status --short
git log --oneline -5
```

The tree must be clean and `main` must be up to date.

## 2. Run all checks

```bash
bun test
bun run typecheck
```

Both must pass before anything else.

## 3. Update the version

```bash
bunx npm version <major|minor|patch> --no-git-tag-version
```

Default: `patch`. Confirm the bump in `package.json` (`version` field).

## 4. Update the changelog

If a `CHANGELOG.md` exists, add an entry for the new version summarizing the
changes since the last release. Commit it together with the version bump.

## 5. Dry-run the publish

```bash
bunx npm pack --dry-run
```

Verify the tarball contains ONLY the `src/` directory (per the `files` field
in `package.json`) — no `test/`, no `.opencode/`, no `docs/` unless intended.

## 6. Commit and tag

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v<version>"
git tag v<version>
```

## 7. Publish (maintainers only)

```bash
npm publish
git push --follow-tags
```

After publishing, verify the package page shows the new version and the CI
badge on the README is green.

## Do NOT

- Do NOT publish with failing tests or typecheck.
- Do NOT publish a version that already exists on npm.
- Do NOT include secrets or local `.omo/` / `.superpowers/` files in the
  tarball.
