# opencode-tell-sessions

[English](README.md) | [Français](README.fr.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/opencode-tell-sessions)](https://www.npmjs.com/package/opencode-tell-sessions)
[![npm downloads](https://img.shields.io/npm/dm/opencode-tell-sessions)](https://www.npmjs.com/package/opencode-tell-sessions)
[![License](https://img.shields.io/npm/l/opencode-tell-sessions)](https://github.com/ThomasSanna/opencode-tell-sessions/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/ThomasSanna/opencode-tell-sessions/ci.yml?branch=main)](https://github.com/ThomasSanna/opencode-tell-sessions/actions)
[![Release](https://img.shields.io/github/v/release/ThomasSanna/opencode-tell-sessions)](https://github.com/ThomasSanna/opencode-tell-sessions/releases)

Inter-session direct messaging (DM) for OpenCode: agents in different sessions
on the same server can talk to each other in real time, without human
intervention.

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["opencode-tell-sessions@latest"]
}
```

## Usage

From any session, ask the agent to talk to another session, by title, date, or
conversation content:

- "ask the frontend session to update the endpoint"
- "tell weekly-digest we renamed users.name to display_name"
- "find the latest session that talks about weeklyDigest and send it this message"

The agent uses `session_search` to find the right session, then
`session_send` to send it a message. The message appears in the
target session with the `@source-title` prefix.

## Development

```bash
bun install
bun test        # unit tests
bun run typecheck
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution guide —
language policy, project structure, and pull request process.

## License

MIT
