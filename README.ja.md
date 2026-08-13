# opencode-tell-sessions

[English](README.md) | [Français](README.fr.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/opencode-tell-sessions)](https://www.npmjs.com/package/opencode-tell-sessions)
[![npm downloads](https://img.shields.io/npm/dm/opencode-tell-sessions)](https://www.npmjs.com/package/opencode-tell-sessions)
[![License](https://img.shields.io/npm/l/opencode-tell-sessions)](https://github.com/ThomasSanna/opencode-tell-sessions/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/ThomasSanna/opencode-tell-sessions/ci.yml?branch=main)](https://github.com/ThomasSanna/opencode-tell-sessions/actions)
[![Release](https://img.shields.io/github/v/release/ThomasSanna/opencode-tell-sessions)](https://github.com/ThomasSanna/opencode-tell-sessions/releases)

OpenCode のセッション間ダイレクトメッセージ（DM）: 同じサーバー上の異なる
セッションのエージェント同士が、人間の介入なしにリアルタイムで会話できます。

## インストール

`opencode.json` にプラグインを追加します:

```json
{
  "plugin": ["opencode-tell-sessions"]
}
```

## 使い方

任意のセッションから、エージェントにタイトル、日付、または会話の内容で
別のセッションと話すように依頼します:

- 「フロントエンドのセッションにエンドポイントの更新を依頼して」
- 「weekly-digest に users.name を display_name に変更したと伝えて」
- 「weeklyDigest について話している最新のセッションを見つけて、このメッセージを送って」

エージェントは `session_search` で適切なセッションを見つけ、次に
`session_send` でメッセージを送信します。メッセージは `@source-title`
プレフィックス付きで対象セッションに表示されます。

## 開発

```bash
bun install
bun test        # ユニットテスト
bun run typecheck
```

## コントリビューション

コントリビューションガイドは [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください:
言語ポリシー、プロジェクト構造、プルリクエストの手順。

## ライセンス

MIT
