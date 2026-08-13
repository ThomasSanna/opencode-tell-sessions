# opencode-tell-sessions

[English](README.md) | [Français](README.fr.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/opencode-tell-sessions)](https://www.npmjs.com/package/opencode-tell-sessions)
[![npm downloads](https://img.shields.io/npm/dm/opencode-tell-sessions)](https://www.npmjs.com/package/opencode-tell-sessions)
[![License](https://img.shields.io/npm/l/opencode-tell-sessions)](https://github.com/ThomasSanna/opencode-tell-sessions/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/ThomasSanna/opencode-tell-sessions/ci.yml?branch=main)](https://github.com/ThomasSanna/opencode-tell-sessions/actions)
[![Release](https://img.shields.io/github/v/release/ThomasSanna/opencode-tell-sessions)](https://github.com/ThomasSanna/opencode-tell-sessions/releases)

OpenCode 的会话间直接消息（DM）: 同一服务器上不同会话中的代理可以在无需
人工干预的情况下实时相互通信。

## 安装

将插件添加到你的 `opencode.json` 中：

```json
{
  "plugin": ["opencode-tell-sessions"]
}
```

## 用法

在任意会话中，让代理按标题、日期或对话内容与另一个会话通信：

- "让前端会话更新该端点"
- "告诉 weekly-digest 我们把 users.name 改名为 display_name"
- "找到最近讨论 weeklyDigest 的会话，并给它发送这条消息"

代理会先用 `session_search` 找到正确的会话，再用 `session_send` 发送消息。
消息会以 `@source-title` 前缀显示在目标会话中。

## 开发

```bash
bun install
bun test        # 单元测试
bun run typecheck
```

## 贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md) 了解贡献指南：语言政策、项目结构和
拉取请求流程。

## 许可证

MIT
