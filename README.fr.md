# opencode-tell-sessions

[English](README.md) | [Français](README.fr.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/opencode-tell-sessions)](https://www.npmjs.com/package/opencode-tell-sessions)
[![npm downloads](https://img.shields.io/npm/dm/opencode-tell-sessions)](https://www.npmjs.com/package/opencode-tell-sessions)
[![License](https://img.shields.io/npm/l/opencode-tell-sessions)](https://github.com/ThomasSanna/opencode-tell-sessions/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/ThomasSanna/opencode-tell-sessions/ci.yml?branch=main)](https://github.com/ThomasSanna/opencode-tell-sessions/actions)
[![Release](https://img.shields.io/github/v/release/ThomasSanna/opencode-tell-sessions)](https://github.com/ThomasSanna/opencode-tell-sessions/releases)

Messagerie directe (DM) entre sessions pour OpenCode : les agents de sessions
différentes sur le même serveur peuvent se parler en temps réel, sans
intervention humaine.

## Installation

Ajoutez le plugin à votre `opencode.json` :

```json
{
  "plugin": ["opencode-tell-sessions@latest"]
}
```

## Utilisation

Depuis n'importe quelle session, demandez à l'agent de parler à une autre
session, par titre, date ou contenu de conversation :

- « demandez à la session frontend de mettre à jour l'endpoint »
- « dites à weekly-digest que nous avons renommé users.name en display_name »
- « trouvez la session la plus récente qui parle de weeklyDigest et envoyez-lui ce message »

L'agent utilise `session_search` pour trouver la bonne session, puis
`session_send` pour lui envoyer un message. Le message apparaît dans la
session cible avec le préfixe `@source-title`.

## Développement

```bash
bun install
bun test        # tests unitaires
bun run typecheck
```

## Contribution

Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour le guide de contribution :
politique linguistique, structure du projet et processus des pull requests.

## Licence

MIT
