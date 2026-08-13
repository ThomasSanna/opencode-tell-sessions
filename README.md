# opencode-tell-sessions

Inter-session direct messaging (DM) for OpenCode: agents in different sessions
on the same server can talk to each other in real time, without human
intervention.

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["opencode-tell-sessions"]
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

## License

MIT
