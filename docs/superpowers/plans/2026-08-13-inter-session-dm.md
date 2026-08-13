# Plugin DM inter-sessions — Implementation Plan (layout canonique OSS)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un plugin OpenCode v1 (`src/index.ts`) qui permet à l'agent d'une session d'envoyer un message direct (DM) à une autre session du même serveur, et de découvrir des sessions par titre ambigu / date / contenu de transcript.

**Architecture:** Plugin v1 = fonction `(input) => Promise<Hooks>` recevant le client SDK complet. Deux outils enregistrés via `Hooks.tool` : `session_search` (découverte : match titre + match contenu avec crop) et `session_send` (envoi fire-and-forget via `client.session.promptAsync`, préfixe `@source | message`). Logique pure (résolution de cible, formatage, crop, tri) exportée depuis `src/index.ts` et testée en unitaire via `bun test`. Zéro état persistant. Layout repo canonique OSS (zéro-build TS, comme `opencode-command-inject` / `opencode-wakatime`) : source en `src/`, pas de build, OpenCode charge le TS directement via Bun.

**Tech Stack:** TypeScript strict, `@opencode-ai/plugin@1.18.16`, `@opencode-ai/sdk@1.18.16`, `zod@4`, Bun 1.3.14 (tests + typecheck), git (repo initialisé en Task 0).

## Global Constraints

- **Repo : `E:\programmes\apps\opencode-plugins`** — la racine EST le package du plugin. Layout canonique OSS :
  ```
  src/index.ts            ← entrée du plugin (export const plugin + export default)
  test/*.test.ts          ← tests bun (import depuis ../src/index)
  package.json            ← name: opencode-inter-session-dm, zero-build TS
  tsconfig.json           ← strict, noEmit, moduleResolution bundler
  opencode.json           ← dev local : "plugin": ["./src/index.ts"]
  README.md, LICENSE, .gitignore
  docs/superpowers/       ← spec + plan (committés)
  ```
- **Git OBLIGATOIRE** : le repo est initialisé en Task 0. Chaque tâche se termine par un commit (`git add` + `git commit`). Pas de repo = pas de tâche terminée.
- `.gitignore` racine : `node_modules/`, `dist/`, `*.log`, `.DS_Store`, `.opencode/`, `.omo/`, `.codegraph/` — l'ancien scaffold `.opencode/` (package.json + node_modules de l'ancien layout) est **supprimé** en Task 0.
- Export convention OSS (wakatime) : `export const plugin: Plugin = async (input) => {...}; export default plugin;` — PAS `export const Plugin`.
- Runtime cible : OpenCode v1 1.18.18, chargé via `opencode.json` → `"plugin": ["./src/index.ts"]`. API v2 hors périmètre.
- Zéro état persistant : pas de registre, pas de fichier de config, pas de cache sur disque.
- Zéro `any`, zéro `@ts-ignore`/`@ts-expect-error`, `strict: true`.
- Tous les appels client passent `{ throwOnError: true }` (rejet en cas d'erreur HTTP) — le code attrape les erreurs et les convertit en messages pour l'agent.
- **Déviation spec documentée** : le spec dit `client.session.prompt(...)` + `.catch()`. Le SDK expose `client.session.promptAsync` ("create and send a new message... return immediately", HTTP 204) — c'est le fire-and-forget natif, plus propre. Le plan l'utilise.
- L'utilisateur a validé (brainstorming) : identité par titre/date/contenu, permissions OpenCode standard, approche purement outils, layout canonique OSS.

---

### Task 0: Repo setup — git init + scaffold canonique OSS

**Files:**
- Create: `.gitignore`
- Create: `LICENSE` (MIT)
- Create: `README.md`
- Create: `opencode.json` (dev local)
- Create: `package.json` (canonique, zéro-build)
- Delete: `.opencode/` (ancien scaffold : package.json, package-lock.json, node_modules, plugin/) — remplacé par la racine
- Commit: tout + `docs/superpowers/` (spec + plan déjà écrits)

**Interfaces:**
- Consumes: rien.
- Produces: repo git initialisé (branche `main`), commit initial avec scaffold + spec + plan. Base `HEAD` pour toutes les tâches suivantes.

- [ ] **Step 1: Supprimer l'ancien scaffold `.opencode/`**

Run (workdir `E:\programmes\apps\opencode-plugins`):
```
Remove-Item -Recurse -Force .opencode
```
Expected: le dossier `.opencode/` (package.json 1.18.16, node_modules, plugin/ vide) disparaît. Il est remplacé par le layout canonique à la racine.

- [ ] **Step 2: Initialiser le repo git**

Run (workdir `E:\programmes\apps\opencode-plugins`):
```
git init -b main
```
Expected: `Initialized empty Git repository`. Vérifier : `git branch --show-current` → `main`.

- [ ] **Step 3: Créer `.gitignore`**

Créer `.gitignore` :

```
node_modules/
dist/
*.log
.DS_Store
.opencode/
.omo/
.codegraph/
```

- [ ] **Step 4: Créer `LICENSE` (MIT)**

Créer `LICENSE` :

```
MIT License

Copyright (c) 2026 Thomas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Note : l'auteur est un placeholder — l'utilisateur le remplacera avant publication.

- [ ] **Step 5: Créer `package.json` (canonique, zéro-build TS)**

Créer `package.json` :

```json
{
  "name": "opencode-inter-session-dm",
  "version": "0.1.0",
  "description": "Inter-session direct messaging (DM) for OpenCode: agents in different sessions can message each other",
  "type": "module",
  "main": "./src/index.ts",
  "module": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": ["src"],
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  },
  "keywords": ["opencode", "opencode-plugin"],
  "license": "MIT",
  "dependencies": {
    "@opencode-ai/sdk": "1.18.16",
    "zod": "^4.1.8"
  },
  "peerDependencies": {
    "@opencode-ai/plugin": ">=1.0.0"
  },
  "devDependencies": {
    "@opencode-ai/plugin": "1.18.16",
    "typescript": "^5.8.2"
  }
}
```

Note : zéro-build — `main`/`exports` pointent le TS directement (OpenCode charge avec Bun, comme `opencode-command-inject`). `@opencode-ai/sdk` et `zod` sont des dépendances explicites (importés directement par le plugin). `@opencode-ai/plugin` est peer (convention wakatime/openspec) + dev pour le typecheck.

- [ ] **Step 6: Installer les dépendances**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun install`
Expected: install ok, `node_modules/@opencode-ai/plugin`, `node_modules/zod`, `node_modules/@opencode-ai/sdk`, `node_modules/typescript` existent. `bun.lock` créé.

- [ ] **Step 7: Créer `opencode.json` (dev local)**

Créer `opencode.json` :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./src/index.ts"]
}
```

Note : c'est la config de DÉVELOPPEMENT de ce repo. Les consommateurs du plugin publié mettront `"plugin": ["opencode-inter-session-dm"]` dans LEUR config (documenté dans le README). Si le loader refuse `"./src/index.ts"` (voir Task 5), essayer `"plugin": ["./"]` (résolution via package.json `main`).

- [ ] **Step 8: Créer `README.md`**

Créer `README.md` :

```markdown
# opencode-inter-session-dm

Messagerie directe (DM) inter-sessions pour OpenCode : les agents de sessions
différentes du même serveur peuvent se parler en temps réel, sans intervention
humaine.

## Installation

Ajoutez le plugin à votre `opencode.json` :

```json
{
  "plugin": ["opencode-inter-session-dm"]
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
```

- [ ] **Step 9: Commit initial**

Run (workdir `E:\programmes\apps\opencode-plugins`):
```
git add -A
git commit -m "chore: init opencode-inter-session-dm plugin (canonical OSS layout)"
```
Expected: commit créé avec .gitignore, LICENSE, README.md, opencode.json, package.json, bun.lock, docs/superpowers/. Vérifier : `git log --oneline` → 1 commit. `git status` propre.

---

### Task 1: Scaffold — tsconfig + typecheck + squelette de plugin

**Files:**
- Create: `tsconfig.json`
- Create: `src/index.ts` (squelette compilable)
- Test: `test/smoke.test.ts`

**Interfaces:**
- Consumes: repo git + package.json (Task 0).
- Produces: `src/index.ts` exporte `plugin` (type `Plugin` de `@opencode-ai/plugin`) + `export default plugin`. Tâches suivantes ajoutent des exports au même fichier.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `test/smoke.test.ts` :

```ts
import { describe, expect, test } from "bun:test";
import plugin, { plugin as named } from "../src/index";

describe("smoke", () => {
  test("le module exporte le plugin (named + default)", () => {
    expect(typeof named).toBe("function");
    expect(plugin).toBe(named);
  });
});
```

- [ ] **Step 2: Exécuter pour voir échouer**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/smoke.test.ts`
Expected: FAIL — "Cannot find module '../src/index'".

- [ ] **Step 3: Créer le tsconfig**

Créer `tsconfig.json` :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": []
  },
  "include": ["src/index.ts"]
}
```

Note : `skipLibCheck: true` évite les erreurs dans les .d.ts générés de `@opencode-ai/sdk`. `types: []` évite la dépendance à `@types/node`. Les tests sont exclus du typecheck (vérifiés par leur exécution sous bun).

- [ ] **Step 4: Créer le squelette du plugin**

Créer `src/index.ts` :

```ts
import { type Plugin } from "@opencode-ai/plugin";

export const plugin: Plugin = async () => {
  return {
    tool: {},
  };
};

export default plugin;
```

- [ ] **Step 5: Exécuter pour voir passer**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/smoke.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Vérifier le typecheck**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bunx tsc --noEmit`
Expected: exit 0, aucune sortie.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json src/index.ts test/smoke.test.ts
git commit -m "chore: scaffold plugin with typecheck and smoke test"
```

---

### Task 2: Helpers purs — résolution de cible, format DM, crop

**Files:**
- Modify: `src/index.ts` (ajout exports purs)
- Test: `test/helpers.test.ts`

**Interfaces:**
- Consumes: rien (fonctions pures, `Session` type-only).
- Produces (exports nommés de `src/index.ts`, utilisés par Task 3 & 4 et par les tests) :
  - `type ResolveResult = { kind: "ok"; session: Session } | { kind: "ambiguous"; candidates: Session[] } | { kind: "self" } | { kind: "not-found" }`
  - `resolveTarget(sessions: Session[], target: string, senderID?: string): ResolveResult`
  - `formatDM(senderTitle: string, message: string): string`
  - `cropExcerpt(text: string, query: string, maxChars?: number): string | undefined`
  - `collectText(parts: readonly { type?: string; text?: string; synthetic?: boolean }[]): string`
  - `recentSessions(sessions: Session[], limit: number, excludeID?: string): Session[]`
  - `searchByTitle(sessions: Session[], query: string): Session[]`
  - `fmtTime(ts: number): string`
  - `export type { Session }` (ré-export pour les fixtures de tests)

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `test/helpers.test.ts` :

```ts
import { describe, expect, test } from "bun:test";
import {
  collectText,
  cropExcerpt,
  formatDM,
  recentSessions,
  resolveTarget,
  searchByTitle,
  fmtTime,
  type Session,
} from "../src/index";

const session = (id: string, title: string, updated: number): Session => ({
  id,
  projectID: "p1",
  directory: "/proj",
  title,
  version: "1",
  time: { created: 0, updated },
});

describe("resolveTarget", () => {
  const sessions = [
    session("a", "frontend build", 100),
    session("b", "backend api", 200),
    session("c", "frontend auth", 300),
  ];

  test("UUID direct", () => {
    const r = resolveTarget(sessions, "b");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.session.id).toBe("b");
  });

  test("titre exact", () => {
    const r = resolveTarget(sessions, "backend api");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.session.id).toBe("b");
  });

  test("sous-chaîne unique insensible à la casse", () => {
    const r = resolveTarget(sessions, "BACKEND");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.session.id).toBe("b");
  });

  test("sous-chaîne ambiguë → candidats", () => {
    const r = resolveTarget(sessions, "frontend");
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") expect(r.candidates.map((s) => s.id).sort()).toEqual(["a", "c"]);
  });

  test("aucun match", () => {
    const r = resolveTarget(sessions, "nope");
    expect(r.kind).toBe("not-found");
  });

  test("cible = expéditeur → self", () => {
    const r = resolveTarget(sessions, "backend api", "b");
    expect(r.kind).toBe("self");
  });
});

describe("formatDM", () => {
  test("préfixe @source", () => {
    expect(formatDM("user-profiles", "users.name → display_name")).toBe(
      "@user-profiles | users.name → display_name",
    );
  });
  test("titre source trop long tronqué à 60 chars", () => {
    const long = "x".repeat(80);
    expect(formatDM(long, "hi")).toBe(`@${"x".repeat(60)}… | hi`);
  });
});

describe("cropExcerpt", () => {
  test("extrait autour de la query avec ellipsis", () => {
    const text = "a".repeat(50) + "frontend" + "b".repeat(50);
    const ex = cropExcerpt(text, "frontend", 30);
    expect(ex).toContain("frontend");
    expect(ex!.length).toBeLessThanOrEqual(30);
    expect(ex!.startsWith("…")).toBe(true);
    expect(ex!.endsWith("…")).toBe(true);
  });
  test("pas de match → undefined", () => {
    expect(cropExcerpt("hello world", "zzz")).toBeUndefined();
  });
  test("texte plus court que maxChars → texte entier sans ellipsis", () => {
    expect(cropExcerpt("frontend ici", "frontend", 300)).toBe("frontend ici");
  });
});

describe("collectText", () => {
  test("concatène les parts text non-synthetic", () => {
    const parts = [
      { type: "text", text: "a" },
      { type: "text", text: " b", synthetic: true },
      { type: "tool", text: "ignored" },
    ];
    expect(collectText(parts)).toBe("a");
  });
});

describe("recentSessions", () => {
  const sessions = [
    session("a", "old", 100),
    session("b", "mid", 200),
    session("c", "new", 300),
  ];
  test("top N par updated desc, exclusion optionnelle", () => {
    expect(recentSessions(sessions, 2).map((s) => s.id)).toEqual(["c", "b"]);
    expect(recentSessions(sessions, 2, "c").map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("searchByTitle", () => {
  const sessions = [
    session("a", "Frontend build", 100),
    session("b", "Backend api", 200),
  ];
  test("sous-chaîne insensible à la casse", () => {
    expect(searchByTitle(sessions, "frontend").map((s) => s.id)).toEqual(["a"]);
    expect(searchByTitle(sessions, "zzz")).toEqual([]);
  });
});

describe("fmtTime", () => {
  test("timestamp → ISO court", () => {
    expect(fmtTime(0)).toBe("1970-01-01T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Exécuter pour voir échouer**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/helpers.test.ts`
Expected: FAIL — erreurs "does not provide an export named" pour tous les imports de `../src/index`.

- [ ] **Step 3: Implémenter les helpers**

Ajouter en tête de `src/index.ts` (avant le `export const plugin`) :

```ts
import type { Session } from "@opencode-ai/sdk";

// Ré-exporté pour que les tests puissent typer leurs fixtures :
export type { Session };

export type ResolveResult =
  | { kind: "ok"; session: Session }
  | { kind: "ambiguous"; candidates: Session[] }
  | { kind: "self" }
  | { kind: "not-found" };

export function resolveTarget(
  sessions: Session[],
  target: string,
  senderID?: string,
): ResolveResult {
  const t = target.trim();
  if (senderID && t === senderID) return { kind: "self" };
  const exact = sessions.find((s) => s.title === t);
  if (exact) return { kind: "ok", session: exact };
  const direct = sessions.find((s) => s.id === t);
  if (direct) return { kind: "ok", session: direct };
  const lower = t.toLowerCase();
  const matches = sessions.filter((s) => s.title.toLowerCase().includes(lower));
  if (matches.length === 1) return { kind: "ok", session: matches[0] };
  if (matches.length > 1) return { kind: "ambiguous", candidates: matches };
  return { kind: "not-found" };
}

export function formatDM(senderTitle: string, message: string): string {
  const source = senderTitle.length > 60 ? `${senderTitle.slice(0, 60)}…` : senderTitle;
  return `@${source} | ${message}`;
}

export function cropExcerpt(
  text: string,
  query: string,
  maxChars = 300,
): string | undefined {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return undefined;
  if (text.length <= maxChars) return text;
  const half = Math.max(
    0,
    Math.floor((maxChars - query.length - 2) / 2),
  );
  const start = Math.max(0, idx - half);
  const end = Math.min(text.length, idx + query.length + half);
  return `…${text.slice(start, end)}…`;
}

export function collectText(
  parts: readonly { type?: string; text?: string; synthetic?: boolean }[],
): string {
  return parts
    .filter((p) => p.type === "text" && !p.synthetic && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("\n");
}

export function recentSessions(
  sessions: Session[],
  limit: number,
  excludeID?: string,
): Session[] {
  return [...sessions]
    .filter((s) => s.id !== excludeID)
    .sort((a, b) => b.time.updated - a.time.updated)
    .slice(0, limit);
}

export function searchByTitle(sessions: Session[], query: string): Session[] {
  const q = query.toLowerCase();
  return sessions.filter((s) => s.title.toLowerCase().includes(q));
}

export function fmtTime(ts: number): string {
  return new Date(ts).toISOString();
}
```

- [ ] **Step 4: Exécuter pour voir passer**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/helpers.test.ts`
Expected: PASS (tous les tests).

- [ ] **Step 5: Typecheck**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bunx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts test/helpers.test.ts
git commit -m "feat: dm helpers purs (resolve, format, crop, search)"
```

---

### Task 3: Outil `session_search` — découverte des sessions

**Files:**
- Modify: `src/index.ts` (implémentation de `buildSearchResult` + enregistrement du tool)
- Test: `test/search.test.ts`

**Interfaces:**
- Consumes: helpers de Task 2 (`searchByTitle`, `recentSessions`, `collectText`, `cropExcerpt`, `fmtTime`), types `Session`/`Part` du SDK, `tool` de `@opencode-ai/plugin/tool`, `ToolContext`.
- Produces: export nommé `buildSearchResult(hits: SearchHit[]): string` où `SearchHit = { sessionID: string; title: string; created: number; updated: number; directory?: string; excerpt?: string }`. Utilisé par le tool et testé. Le tool `session_search` est enregistré dans `Hooks.tool`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `test/search.test.ts` :

```ts
import { describe, expect, test } from "bun:test";
import { buildSearchResult } from "../src/index";

describe("buildSearchResult", () => {
  test("liste lisible avec excerpt optionnel", () => {
    const out = buildSearchResult([
      {
        sessionID: "a",
        title: "frontend build",
        created: 0,
        updated: 100,
        directory: "/proj",
        excerpt: "…frontend…",
      },
    ]);
    expect(out).toContain("frontend build");
    expect(out).toContain("a");
    expect(out).toContain("…frontend…");
    expect(out).toContain("1970-01-01T00:00:00.100Z");
  });

  test("truncation à 6000 chars", () => {
    const hits = Array.from({ length: 50 }, (_, i) => ({
      sessionID: `s${i}`,
      title: `titre ${i}` + "x".repeat(200),
      created: 0,
      updated: i,
    }));
    expect(buildSearchResult(hits).length).toBeLessThanOrEqual(6000);
  });

  test("résultat vide", () => {
    expect(buildSearchResult([])).toBe("Aucune session ne correspond.");
  });
});
```

- [ ] **Step 2: Exécuter pour voir échouer**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/search.test.ts`
Expected: FAIL — "does not provide an export named buildSearchResult".

- [ ] **Step 3: Implémenter `buildSearchResult` + enregistrer le tool**

Ajouter dans `src/index.ts` :

```ts
import { tool } from "@opencode-ai/plugin/tool";
import { z } from "zod";

export type SearchHit = {
  sessionID: string;
  title: string;
  created: number;
  updated: number;
  directory?: string;
  excerpt?: string;
};

export function buildSearchResult(hits: SearchHit[]): string {
  if (hits.length === 0) return "Aucune session ne correspond.";
  const lines: string[] = [];
  for (const h of hits) {
    const dir = h.directory ? ` (${h.directory})` : "";
    const ex = h.excerpt ? `\n    extrait : ${h.excerpt}` : "";
    lines.push(
      `- [${h.sessionID}] ${h.title} — maj ${fmtTime(h.updated)}${dir}${ex}`,
    );
  }
  const out = lines.join("\n");
  const cap = 6000;
  const suffix = "\n… (tronqué)";
  return out.length <= cap ? out : `${out.slice(0, cap - suffix.length)}${suffix}`;
}
```

Puis remplacer le corps du `plugin` pour enregistrer `session_search` (implémentation complète — Task 4 ajoutera `session_send` dans le même objet `tool`) :

```ts
export const plugin: Plugin = async (input) => {
  const client = input.client;

  return {
    tool: {
      session_search: tool({
        description:
          "Recherche une session OpenCode par titre, date ou contenu de conversation. " +
          "Utilise-le quand l'utilisateur mentionne une autre session de façon ambiguë " +
          "(ex. 'la dernière session qui parle de frontend', 'la session backend'). " +
          "Retourne les sessions candidates triées par récence avec leur titre, id, date de mise à jour et un extrait.",
        args: {
          query: z.string().describe("Texte à chercher : titre, mot-clé de contenu, ou description"),
          limit: z.number().int().positive().max(20).optional().describe("Nombre max de sessions (défaut 10)"),
        },
        async execute(args, ctx) {
          const limit = args.limit ?? 10;
          try {
            const { data: sessions } = await client.session.list({ throwOnError: true });
            const all = sessions ?? [];
            const titleHits = searchByTitle(all, args.query);
            const hits: SearchHit[] = titleHits.map((s) => ({
              sessionID: s.id,
              title: s.title,
              created: s.time.created,
              updated: s.time.updated,
              directory: s.directory,
            }));
            const seen = new Set(hits.map((h) => h.sessionID));
            for (const s of recentSessions(all, limit, ctx.sessionID)) {
              if (seen.has(s.id)) continue;
              let excerpt: string | undefined;
              try {
                const { data: msgs } = await client.session.messages({
                  path: { id: s.id },
                  query: { limit: 10 },
                  throwOnError: true,
                });
                const text = (msgs ?? [])
                  .map((m) => collectText(m.parts))
                  .join("\n");
                excerpt = cropExcerpt(text, args.query, 300);
              } catch {
                excerpt = undefined;
              }
              hits.push({
                sessionID: s.id,
                title: s.title,
                created: s.time.created,
                updated: s.time.updated,
                directory: s.directory,
                excerpt,
              });
              seen.add(s.id);
            }
            hits.sort((a, b) => b.updated - a.updated);
            return { title: "Sessions trouvées", output: buildSearchResult(hits) };
          } catch (err) {
            return {
              title: "Erreur session_search",
              output: `Impossible de lister les sessions : ${String(err)}`,
            };
          }
        },
      }),
    },
  };
};
```

Note : `ToolContext.sessionID` vient de `@opencode-ai/plugin/tool` (type inféré par `tool()`). `m.parts` est typé `Part[]` — compatible avec le paramètre `readonly { type?; text?; synthetic? }[]` de `collectText` (les `Part` du SDK sont une union avec `type: string`).

- [ ] **Step 4: Exécuter pour voir passer**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/search.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bunx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts test/search.test.ts
git commit -m "feat: tool session_search (titre + contenu croppé)"
```

---

### Task 4: Outil `session_send` — envoi du DM

**Files:**
- Modify: `src/index.ts` (enregistrement du tool `session_send`)
- Test: `test/send.test.ts`

**Interfaces:**
- Consumes: `resolveTarget`, `formatDM`, `recentSessions`, `fmtTime`, `buildSearchResult`, `type SearchHit` (Task 2 & 3), `ToolContext`.
- Produces: le tool `session_send` dans `Hooks.tool` (utilisé par l'agent). Exports testés : `describeCandidates(candidates: Session[]): string` et `listRecentHint(sessions: Session[]): string`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `test/send.test.ts` :

```ts
import { describe, expect, test } from "bun:test";
import {
  describeCandidates,
  listRecentHint,
  type Session,
} from "../src/index";

const session = (id: string, title: string, updated: number): Session => ({
  id,
  projectID: "p1",
  directory: "/proj",
  title,
  version: "1",
  time: { created: 0, updated },
});

describe("describeCandidates", () => {
  test("liste lisible avec id, titre et date", () => {
    const out = describeCandidates([session("a", "frontend build", 100)]);
    expect(out).toContain("a");
    expect(out).toContain("frontend build");
    expect(out).toContain("1970-01-01T00:00:00.100Z");
  });
  test("vide → message dédié", () => {
    expect(describeCandidates([])).toBe("Aucune session ne correspond.");
  });
});

describe("listRecentHint", () => {
  test("top 5 avec titre et id", () => {
    const sessions = Array.from({ length: 6 }, (_, i) => session(`s${i}`, `t${i}`, i));
    const out = listRecentHint(sessions);
    expect(out).toContain("s5");
    expect(out).toContain("s1");
    expect(out).not.toContain("s0");
  });
});
```

- [ ] **Step 2: Exécuter pour voir échouer**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/send.test.ts`
Expected: FAIL — exports manquants.

- [ ] **Step 3: Implémenter `describeCandidates` + `listRecentHint`**

Ajouter dans `src/index.ts` :

```ts
export function describeCandidates(candidates: Session[]): string {
  if (candidates.length === 0) return "Aucune session ne correspond.";
  return candidates
    .map(
      (s) =>
        `- [${s.id}] ${s.title} — maj ${fmtTime(s.time.updated)}`,
    )
    .join("\n");
}

export function listRecentHint(sessions: Session[]): string {
  return recentSessions(sessions, 5)
    .map((s) => `- [${s.id}] ${s.title} — maj ${fmtTime(s.time.updated)}`)
    .join("\n");
}
```

- [ ] **Step 4: Exécuter pour voir passer**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/send.test.ts`
Expected: PASS.

- [ ] **Step 5: Enregistrer le tool `session_send`**

Dans `src/index.ts`, ajouter `session_send` dans l'objet `tool` (après `session_search`) :

```ts
      session_send: tool({
        description:
          "Envoie un message direct (DM) à une autre session OpenCode du même serveur. " +
          "Utilise-le quand l'utilisateur demande de parler à une autre session " +
          "(ex. 'demande à la session frontend de...', 'tell weekly-digest ...'). " +
          "Le message est injecté dans la session cible avec le préfixe @titre-source. " +
          "N'envoie un DM que si l'utilisateur le demande ou si un autre agent t'a explicitement demandé de répondre. " +
          "Ne réponds pas automatiquement à un DM reçu, sauf si le message contient une question ou une requête pour toi.",
        args: {
          target: z.string().describe("Titre de la session cible (ou son id)"),
          message: z.string().describe("Contenu du message à envoyer"),
        },
        async execute(args, ctx) {
          try {
            const { data: sessions } = await client.session.list({ throwOnError: true });
            const all = sessions ?? [];
            const resolved = resolveTarget(all, args.target, ctx.sessionID);
            if (resolved.kind === "self") {
              return {
                title: "session_send refusé",
                output: "Tu es déjà dans cette session. Choisis une autre session cible.",
              };
            }
            if (resolved.kind === "not-found") {
              const hint = listRecentHint(all);
              return {
                title: "Session introuvable",
                output:
                  `Session "${args.target}" introuvable. Utilise session_search pour trouver la bonne session.\n` +
                  `Sessions récentes du serveur :\n${hint}`,
              };
            }
            if (resolved.kind === "ambiguous") {
              return {
                title: "Session ambiguë",
                output:
                  `Plusieurs sessions correspondent à "${args.target}". Précise avec un id ou un titre plus exact :\n` +
                  describeCandidates(resolved.candidates),
              };
            }
            const targetSession = resolved.session;
            const sender =
              all.find((s) => s.id === ctx.sessionID)?.title ?? ctx.sessionID;
            const text = formatDM(sender, args.message);
            await client.session.promptAsync({
              path: { id: targetSession.id },
              body: { parts: [{ type: "text", text }] },
              throwOnError: true,
            });
            return {
              title: "DM envoyé",
              output:
                `DM envoyé à "${targetSession.title}" (${targetSession.id}) à ${fmtTime(Date.now())}.`,
            };
          } catch (err) {
            return {
              title: "Erreur session_send",
              output: `Impossible d'envoyer le DM : ${String(err)}`,
            };
          }
        },
      }),
```

- [ ] **Step 6: Exécuter tous les tests**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/`
Expected: PASS (smoke + helpers + search + send).

- [ ] **Step 7: Typecheck**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bunx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/index.ts test/send.test.ts
git commit -m "feat: tool session_send (fire-and-forget via promptAsync)"
```

---

### Task 5: Vérification manuelle E2E (scénario réel)

**Files:**
- Aucun (test manuel dans OpenCode).

**Interfaces:**
- Consumes: le plugin complet (Task 0-4) + `opencode.json` (Task 0).

- [ ] **Step 1: Vérifier le chargement du plugin**

Lancer `opencode` à la racine du repo (workdir `E:\programmes\apps\opencode-plugins`). Vérifier :
- Aucune erreur de chargement du plugin dans les logs/session.
- Si le loader refuse `"./src/index.ts"` : éditer `opencode.json` → `"plugin": ["./"]` (résolution via package.json `main`), relancer, vérifier le chargement. Committer le changement si nécessaire.

- [ ] **Step 2: Vérifier que les outils sont visibles**

Dans la session, demander : *"quels outils as-tu disponibles ?"* ou vérifier via l'UI que `session_search` et `session_send` apparaissent dans la liste des outils.

- [ ] **Step 3: Préparer deux sessions nommées**

1. Session A (celle-ci) : `/title user-profiles`
2. Nouvelle session B (autre onglet, même projet) : `/title weekly-digest`
3. Donner à B un contenu parlant : *"je travaille sur un job hebdomadaire qui utilise users.name dans src/jobs/weeklyDigest.ts"*

- [ ] **Step 4: Envoyer le DM depuis A**

Dans la session A, demander :
*"demande à la session weekly-digest de mettre à jour son SQL : users.name → users.display_name"*

Vérifier :
- L'agent A appelle `session_search` (ou directement `session_send` avec le titre).
- La sortie du tool confirme "DM envoyé à ... (id)".

- [ ] **Step 5: Vérifier la réception dans B**

Dans la session B :
- Un message utilisateur `@user-profiles | users.name → users.display_name` apparaît dans le transcript (préfixe @ visible).
- L'agent B réagit et propose/effectue la modification de `src/jobs/weeklyDigest.ts`.

- [ ] **Step 6: Vérifier les cas limites**

1. **Ambigu** : créer une 3e session `/title user-profiles-2` (ou un titre contenant "user-profiles"), redemander un DM à "user-profiles" depuis A → le tool retourne la liste des candidats, l'agent demande de préciser.
2. **Introuvable** : demander un DM à "session-inexistante" → le tool retourne "Session introuvable" + la liste des 5 sessions récentes.
3. **Auto-envoi** : demander à l'agent de s'envoyer un DM à lui-même (son propre titre) → refus "Tu es déjà dans cette session".
4. **Recherche par contenu** : dans A, demander *"trouve la dernière session qui parle de weeklyDigest"* → `session_search` retourne la session B avec un extrait du transcript.

- [ ] **Step 7: Typecheck final**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bunx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 8: Commit final si fichiers modifiés**

```bash
git add -A
git commit -m "docs: E2E vérifié (chargement, DM A→B, cas limites)"
```
Sauter si rien n'a changé (aucune modification de fichier pendant le test manuel).

---

## Self-Review (à exécuter après écriture du plan)

1. **Spec coverage** : chaque section du spec (voir `docs/superpowers/specs/2026-08-13-inter-session-dm-design.md`) doit correspondre à une tâche.
2. **Placeholder scan** : aucun "TBD"/"TODO"/"implement later" dans le plan.
3. **Type consistency** : noms cohérents entre tâches (`resolveTarget`, `formatDM`, `cropExcerpt`, `collectText`, `recentSessions`, `searchByTitle`, `fmtTime`, `buildSearchResult`, `describeCandidates`, `listRecentHint`, `SearchHit`, `ResolveResult`).
