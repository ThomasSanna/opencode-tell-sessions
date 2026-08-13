# Contributing to opencode-tell-sessions

Thanks for your interest in contributing! This document sets the ground rules
so that every contribution is easy to review, merge, and maintain.

## Table of Contents

- [Language Policy](#language-policy)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Publishing](#publishing)

## Language Policy

All communication in this project — issues, pull requests, comments, commit
messages — must be in **English**. This keeps the project accessible to
contributors from every timezone. The codebase, docs, and translations are
English-first; localized READMEs are translations of the English source.

If English is not your first language, don't worry — write as best you can and
say so; maintainers will help.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (the project uses `bun` as package manager, test runner,
  and typecheck driver)
- Git

### Development Setup

```bash
git clone https://github.com/ThomasSanna/opencode-tell-sessions.git
cd opencode-tell-sessions
bun install
```

### Testing Your Changes Locally

```bash
bun test            # unit tests
bun run typecheck   # TypeScript strict checks
```

## Development Environment

There is no build step: the plugin is loaded directly from TypeScript source
(`src/index.ts`). For local testing against a real OpenCode instance, add the
plugin to your `opencode.json`:

```json
{
  "plugin": ["./src/index.ts"]
}
```

## Project Structure

| Path | Purpose |
|---|---|
| `src/index.ts` | Plugin entry. Exports ONLY `plugin` and `export default plugin` — the OpenCode v1 loader iterates every exported function as a candidate plugin, so no other export is allowed here. |
| `src/helpers.ts` | Pure helper functions (`toHit`, `formatSessionLine`, `resolveTarget`, `formatDM`, ...). Tested directly. |
| `test/` | Bun unit tests (`smoke`, `helpers`, `search`, `send`). |
| `.opencode/` | Skills and slash commands shipped with the project. |
| `docs/` | Internal design specs and plans. |

## Development Workflow

1. **One concern per PR.** Keep changes small and focused.
2. **Match existing style.** The codebase is strict TypeScript: no `as any`, no
   `@ts-ignore`, no `@ts-expect-error`.
3. **Every behavior change ships with a test.** Tests are the evidence that a
   change works; the CI gate runs `bun test` and `bun run typecheck` on every
   push and pull request.
4. **Bugfix rule.** Fix minimally — never refactor while fixing.

## Making Changes

1. Create a branch: `git checkout -b feat/your-change`.
2. Make your changes.
3. Add or update tests in `test/`.
4. Run `bun test` and `bun run typecheck` until both pass.
5. Commit with a concise message that matches the repo style
   (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `i18n:`).
6. Open a pull request against `main` using the PR template.

### Adding a Skill or Command

Skills live in `.opencode/skills/<name>/SKILL.md` and commands in
`.opencode/command/<name>.md`. Each skill needs YAML frontmatter with `name`
and `description`. Commands need a `description` and may declare an
`argument-hint`. Keep the content in English.

## Pull Request Process

Use the [PR template](.github/pull_request_template.md). Before opening the PR:

- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] The change is minimal and traced to a real need
- [ ] Commit message follows the repo style
- [ ] Docs/README updated if the user-facing behavior changed

## Publishing

Maintainers only. `npm publish` is run manually after the CI is green on
`main`. The published package includes only the `src/` directory (see the
`files` field in `package.json`).
