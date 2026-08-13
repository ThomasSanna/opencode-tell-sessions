# Design — Plugin OpenCode : messagerie inter-sessions (DM)

**Date** : 2026-08-13
**Statut** : Validé (brainstorming) — en attente de revue du spec
**Runtime cible** : OpenCode v1 (1.18.x), plugin chargé depuis `.opencode/plugin/`

---

## 1. Problème

Dans Claude Code, des sessions nommées peuvent s'envoyer des messages directs (DM) :
l'agent de la session A peut prévenir l'agent de la session B d'un changement de
contrat (API, schéma DB, noms de colonnes), sans intervention humaine.

OpenCode v1 n'a pas cette capacité. Les sessions partagent un serveur commun et
exposent un client SDK capable d'injecter des messages dans n'importe quelle
session — la brique existe, il manque le mécanisme.

**Objectif** : un plugin qui permet à l'agent d'une session d'envoyer un message
à une autre session (par titre ambigu, date, ou contenu de transcript), injecté
dans le transcript cible avec un préfixe `@source`, réveillant l'agent cible.

## 2. Décisions de design (validées)

| Question | Décision |
|---|---|
| Runtime | **v1 d'abord** (fonctionne sur OpenCode 1.18.18 installé). Entrée v2 (Plugin.define) hors périmètre de cette itération. |
| Identité des sessions | **Par titre** (built-in OpenCode, modifiable via /title) + recherche par date + recherche dans le contenu du transcript (croppé). Pas de registre d'alias. |
| Garde-fous | **Permissions OpenCode standard** (approve/deny/allow sur les outils). Pas de confirmation systématique par DM. |
| Approche | **Purement outils** : 2 outils (`session_send`, `session_search`), zéro état persistant, tout via le client SDK. |

## 3. Architecture

Un seul fichier : `.opencode/plugin/dm.ts` — module v1 (export `server: Plugin`).
Types fournis par `@opencode-ai/plugin` (1.18.16, déjà installé dans `.opencode/package.json`).

```
┌─────────────────────┐        ┌─────────────────────┐
│ Session A (agent)   │        │ Session B (agent)   │
│  "tell B que ..."   │        │                     │
│        │            │        │        ▲            │
│        ▼            │        │        │            │
│  tool session_send  │        │ message utilisateur │
│  tool session_search│        │ "@A | contenu"      │
│        │            │        │        │            │
│        └── client.session.prompt(id=B, parts=[text]) ──┘
│                     │
│  ── même serveur OpenCode ──
```

Tous les sessions du même serveur voient les mêmes outils → bidirectionnel par construction.

### 3.1 Outil `session_search`

Découverte sémantique. L'agent l'utilise quand l'utilisateur décrit une session
de façon ambiguë ("la dernière session où on a implémenté une feature côté front").

- **Args (zod)** : `query: string`, `limit?: number` (défaut 10)
- **Logique (déterministe, sans heuristique)** :
  1. `client.session.list()` → toutes les sessions du serveur
  2. **Match titre** : sous-chaîne insensible à la casse sur `title` → candidats
  3. **Match contenu** : dans tous les cas, prend les `limit` sessions les plus
     récentes (`time.updated` décroissant) et cherche `query` dans leur transcript
     via `client.session.messages()` → candidats avec extrait
  4. Fusion des deux listes (dédup par sessionID), les matches titre passent en
     premier, tri par récence
  5. **Crop** : chaque extrait de texte ≤ ~300 caractères, sortie totale plafonnée
     (~6 Ko) pour protéger le contexte de l'agent appelant
- **Retour** : `[{ sessionID, title, created, updated, directory, excerpt? }]`
  triés par récence. L'agent juge et choisit.

### 3.2 Outil `session_send`

Envoi d'un DM.

- **Args (zod)** : `target: string` (titre ou sessionID), `message: string`
- **Logique** :
  1. Si `target` est un UUID → résolution directe
  2. Sinon → titre exact → sous-chaîne unique → si plusieurs candidats :
     **retourner la liste des candidats** (pas de choix arbitraire)
  3. Résolution du titre de l'expéditeur : `ToolContext.sessionID` →
     `client.session.list()` → titre (fallback : sessionID brut)
  4. **Envoi fire-and-forget** : `client.session.prompt({ path: { id }, body: {
     parts: [{ type: "text", text }] } })` — le tool **n'attend pas** la réponse
     de la session cible. La promesse est déclenchée en arrière-plan avec un
     `.catch()` qui log l'échec éventuel (pas d'unhandled rejection).
  5. Retour immédiat : `DM envoyé à "<titre>" (<id>) à <heure>`
- **Garde-fou anti-boucle** : refuse `target === sessionID` courant
  ("Tu es déjà dans cette session")

## 4. Format du message injecté

```
@user-profiles | users.name → users.display_name
```

- `@titre-source` → identifie clairement un DM inter-session (exigence "Visible")
- `|` sépare expéditeur du contenu — format stable et lisible
- Le message est un vrai message utilisateur : il entre dans le transcript,
  devient contexte, et **réveille l'agent** de la session cible (comportement
  exact de l'exemple Claude Code)

## 5. Instructions agent (descriptions d'outils)

- `session_search` : "Recherche une session OpenCode par titre, date ou contenu
  de conversation. Utilise-le quand l'utilisateur mentionne une autre session de
  façon ambiguë (ex. 'la dernière session qui parle de frontend')."
- `session_send` : "Envoie un message direct (DM) à une autre session OpenCode.
  Utilise-le quand l'utilisateur demande de parler à une autre session (ex.
  'demande à la session frontend de...', 'tell weekly-digest ...'). N'envoie un
  DM que si l'utilisateur le demande ou si un autre agent t'a explicitement
  demandé de répondre. Ne réponds pas automatiquement à un DM reçu, sauf si le
  message contient une question ou une requête pour toi."

## 6. Gestion des erreurs

| Cas | Comportement |
|---|---|
| Session cible inexistante | Erreur claire : "Session introuvable. Utilise session_search." + liste des 5 sessions les plus récentes |
| Titre ambigu (2+ sessions) | Retourne la liste des candidats (titre, id, date maj) — l'agent précise |
| Recherche sans résultat | Tableau vide + "aucune session ne correspond" |
| Session cible occupée | Comportement serveur standard : le DM s'ajoute au transcript et sera traité |
| Échec réseau / serveur down | Erreur retournée au tool → l'agent peut réessayer |

## 7. Test & vérification

1. **Build** : `tsc --noEmit` (ou LSP) sur `dm.ts` — types propres, zéro `any`
2. **Test manuel** :
   - Ouvrir 2 sessions dans le projet, renommer via `/title` (`user-profiles`, `weekly-digest`)
   - Session A : "demande à la session weekly-digest de mettre à jour le SQL de weeklyDigest.ts : users.name → users.display_name"
   - Vérifier : A appelle `session_search` puis `session_send` ; le message apparaît
     dans B avec préfixe `@user-profiles` ; B réagit et modifie le fichier
   - Vérifier les cas : titre ambigu, session introuvable
3. **Charge** : `.opencode/plugin/dm.ts` auto-chargé par OpenCode 1.18.18

## 8. Hors périmètre (futur)

- Entrée v2 (`Plugin.define` + `ctx.session`) — docs en avance sur les types publiés
- Registre d'alias stables
- Commandes slash `/tell`
- Log des DM entrants (observabilité)
- Sessions sur des serveurs différents (multi-projets)
