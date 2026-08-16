# opencode-tell-sessions

[English](README.md) | [Français](README.fr.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/opencode-tell-sessions)](https://www.npmjs.com/package/opencode-tell-sessions)
[![npm downloads](https://img.shields.io/npm/dm/opencode-tell-sessions)](https://www.npmjs.com/package/opencode-tell-sessions)
[![License](https://img.shields.io/npm/l/opencode-tell-sessions)](https://github.com/ThomasSanna/opencode-tell-sessions/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/ThomasSanna/opencode-tell-sessions/ci.yml?branch=main)](https://github.com/ThomasSanna/opencode-tell-sessions/actions)
[![Release](https://img.shields.io/github/v/release/ThomasSanna/opencode-tell-sessions)](https://github.com/ThomasSanna/opencode-tell-sessions/releases)

OpenCode용 세션 간 직접 메시지(DM): 같은 서버의 서로 다른 세션에 있는
에이전트들이 사람의 개입 없이 실시간으로 서로 대화할 수 있습니다.

## 설치

`opencode.json`에 플러그인을 추가하세요:

```json
{
  "plugin": ["opencode-tell-sessions@latest"]
}
```

## 사용법

아무 세션에서나 에이전트에게 제목, 날짜 또는 대화 내용을 기준으로 다른
세션과 대화하도록 요청하세요:

- "프론트엔드 세션에 엔드포인트를 업데이트하라고 요청해 줘"
- "weekly-digest에 users.name을 display_name으로 변경했다고 알려 줘"
- "weeklyDigest에 대해 이야기하는 가장 최근 세션을 찾아서 이 메시지를 보내 줘"

에이전트는 `session_search`로 올바른 세션을 찾은 다음 `session_send`로
메시지를 보냅니다. 메시지는 `@source-title` 접두사와 함께 대상 세션에
표시됩니다.

## 개발

```bash
bun install
bun test        # 단위 테스트
bun run typecheck
```

## 기여

기여 가이드는 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요: 언어 정책,
프로젝트 구조 및 풀 리퀘스트 절차.

## 라이선스

MIT
