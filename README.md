# opencode-tell-sessions

Messagerie directe (DM) inter-sessions pour OpenCode : les agents de sessions
différentes du même serveur peuvent se parler en temps réel, sans intervention
humaine.

## Installation

Ajoutez le plugin à votre `opencode.json` :

```json
{
  "plugin": ["opencode-tell-sessions"]
}
```

## Utilisation

Depuis n'importe quelle session, demandez à l'agent de parler à une autre
session — par titre, date ou contenu de conversation :

- « demande à la session frontend de mettre à jour le endpoint »
- « tell weekly-digest we renamed users.name to display_name »
- « trouve la dernière session qui parle de weeklyDigest et envoie-lui ce message »

L'agent utilise `session_search` pour trouver la bonne session, puis
`session_send` pour lui envoyer un message. Le message apparaît dans la
session cible avec le préfixe `@titre-source`.

## Développement

```bash
bun install
bun test        # tests unitaires
bun run typecheck
```

## Licence

MIT
