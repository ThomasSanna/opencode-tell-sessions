# GitHub Workflow

This document describes how `opencode-tell-sessions` is developed, released,
and published on GitHub. It is the reference for both maintainers and
external contributors.

## 1. Branching model

The project uses **trunk-based development** on `main`.

| Branch | Purpose | Who pushes |
|---|---|---|
| `main` | The only long-lived branch. Always releasable: every push runs CI, and `feat:`/`fix:` commits are candidates for the next release. | Maintainers (direct push), automated bots (Release Please, Dependabot), PR merges |
| `feat/...`, `fix/...` | Short-lived feature/fix branches for external contributions. Merged to `main` via PR (squash). | Contributors |

Rules:

- Never force-push to `main`.
- Keep `main` green: `bun test` and `bun run typecheck` must pass before any
  push/merge.
- Small commits, one concern per commit. Commit messages follow the
  conventional format: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`,
  `i18n:`.

## 2. Automation chain

Every push to `main` triggers up to two workflows in parallel:

```
push to main
  ├─► CI (ci.yml)                 bun install --frozen-lockfile
  │                               bun run typecheck
  │                               bun test
  │
  └─► Release Please (release-please.yml)
        ├─ no user-facing change  → nothing happens
        └─ feat:/fix: present     → opens release PR "chore(main): release X.Y.Z"
                                     (version bump + CHANGELOG.md)

merging the release PR
  ├─► creates tag vX.Y.Z (by Release Please)
  └─► creates GitHub release (by Release Please)

tag vX.Y.Z push
  └─► Publish to npm (publish.yml, OIDC)
        ├─ verifies tag == package.json version
        ├─ npm publish --provenance --access public
        └─ SLSA provenance statement attached
```

Three workflows, each with a single responsibility:

| Workflow | Trigger | Responsibility |
|---|---|---|
| `ci.yml` | push to `main`, any PR | Test + typecheck gate |
| `release-please.yml` | push to `main` | Version management: release PR, tag, GitHub release |
| `publish.yml` | tag `v*` push, or manual `workflow_dispatch` | npm publish via Trusted Publishing (OIDC) |

## 3. Version rules

Release Please decides the next version from the **commits since the last
tag**, using conventional commit types:

| Commit type | Effect on version | Example |
|---|---|---|
| `feat:` | **minor** bump (pre-major: `0.x` → `0.(x+1)`) | `feat: add session_send retry` |
| `fix:` | **patch** bump (`0.1.1` → `0.1.2`) | `fix: handle empty title` |
| `refactor:`, `chore:`, `docs:`, `ci:`, `i18n:`, `test:` | **no release** — not user-facing | `docs: fix typo` |
| `BREAKING CHANGE` footer | **major** bump (pre-major: `0.x` → `0.(x+1)` due to `bump-minor-pre-major`) | `feat: rewrite API` |

Important:

- Only **merged-to-main commits** count. Squash-merging a PR folds its
  commits into one — the PR title/commit message decides the bump.
- `bump-minor-pre-major: true` is set: while at `0.x`, breaking changes bump
  the **minor**, not the major.
- A release PR is created only when there is at least one `feat:` or `fix:`
  commit since the last tag. `refactor:`-only pushes stay unreleased.
- The version is bumped in `package.json` **by Release Please**, never by
  hand.

## 4. Pull request lifecycle

### 4.1 Feature PR (external contributors)

1. Create a branch: `git checkout -b feat/your-change`.
2. Make the change, add or update tests.
3. Run `bun test` and `bun run typecheck` locally until green.
4. Push and open a PR against `main` using the PR template.
5. CI runs on the PR. The PR must be **green** before merging.
6. Merge with **squash** and a conventional commit message (the squash
   message becomes the single commit on `main` — it decides the release
   bump, so use `feat:` or `fix:` deliberately).

### 4.2 Release PR (created by Release Please)

- Title: `chore(main): release X.Y.Z`.
- Contains: `package.json` version bump + `CHANGELOG.md` update.
- Do **not** edit the content by hand — let Release Please manage it.
- Review the changelog, then merge with **squash**.
- Merging triggers the tag + GitHub release + npm publish automatically.

### 4.3 Dependabot PRs

- Dependabot opens PRs for `npm` and `github-actions` dependency updates
  (weekly, label `dependencies`).
- CI runs on each PR; merge when green.
- `fix:`-style dependency bumps will trigger a release on merge; minor
  tooling updates usually come as `chore:` and stay unreleased.
- Do not merge two Dependabot PRs back-to-back without checking the release
  PR state — Release Please coalesces pending commits into one release.

## 5. Publishing (npm)

npm publishing uses **Trusted Publishing (OIDC)** — no npm token is stored
anywhere.

| Component | Detail |
|---|---|
| Authentication | npm ↔ GitHub OIDC exchange (`id-token: write` in `publish.yml`) |
| Provenance | `npm publish --provenance` attaches a SLSA provenance statement |
| Guard | workflow refuses to publish if `vX.Y.Z` tag ≠ `package.json` version |
| Manual fallback | `workflow_dispatch` with a `tag` input; `dry-run` input to simulate |
| Secret | `RELEASE_PLEASE_TOKEN` (GitHub PAT, scope `repo`) — makes the tag push re-trigger `publish.yml` (with the default `GITHUB_TOKEN` the tag push would not fire tag-triggered workflows) |

The published package contains only `src/` (see `files` in `package.json`).

## 6. Merging etiquette

| Action | Method |
|---|---|
| Feature/contributor PR | **squash** — one commit on main |
| Release PR | **squash** — Release Please expects a single merge commit |
| Direct pushes to main | allowed for maintainers, keep commits conventional |

Never use **rebase-merge** for Release Please PRs (it can confuse the
tag↔PR association), and never **edit** a release PR's files.

## 7. Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| No release PR after a push | No `feat:`/`fix:` commit since last tag | Add a user-facing change, or accept the push stays unreleased |
| `npm error E404 ... is not in this registry` on publish | Trusted Publisher not configured on npm, or workflow filename mismatch | Check package settings → Trusted Publishing → `publish.yml` |
| `npm error E403 ... previously published versions` | Version already on npm | Expected when re-testing an existing tag; next release will be a new version |
| `publish.yml` not triggered by a tag | `RELEASE_PLEASE_TOKEN` missing — tag pushed with `GITHUB_TOKEN` doesn't fire tag workflows | Add the secret, or run the workflow manually with the tag input |
| Local push rejected (`non-fast-forward`) | `origin/main` advanced (release PR merged) | `git fetch origin && git rebase origin/main`, then push |
