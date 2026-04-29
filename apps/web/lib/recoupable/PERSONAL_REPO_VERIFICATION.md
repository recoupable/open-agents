# Personal-repo onboarding — manual verification

Verified end-to-end on the PR preview deploy on 2026-04-29. All artifacts referenced below are still inspectable on GitHub and Vercel.

**Preview**: https://open-agents-git-feat-personal-repo-o-f51cb7-recoupable-ad724970.vercel.app
**Commit at time of test**: `5db85fa` — `refactor: address round-3 PR feedback`

## Why this needed an extra commit

The first preview run (commit `cf0bbc2`) confirmed the empty-orgs auto-provisioning flow worked, but the downstream `POST /api/sandbox` call returned **502 "Failed to provision sandbox"** because GitHub repos were created with `auto_init: false` — no `main` branch with content, so Vercel Sandbox couldn't clone them. Commit `5db85fa` flips both `createInOrg` and `createForAuthenticatedUser` to `auto_init: true` so the personal repo is born with an `Initial commit` containing a `README.md` on `main`.

## Test 1 — fresh email, empty orgs (the dead-end the PR fixes)

Email: `sweetmantech+29april20261230pm@gmail.com` (never seen by `recoup-api` before).

Network sequence observed in DevTools:

| # | Request | Status | Notes |
|---|---|---|---|
| 1 | `GET test-recoup-api.vercel.app/api/organizations` | **401** | "No account found" — empty-orgs guard fires |
| 2 | `POST /api/sessions/personal` | **200** | New endpoint returns `{ session, chat }` |
| 3 | `POST /api/sandbox` | **200** | Was 502 before `5db85fa` |
| 4 | `GET /api/sandbox/status?sessionId=…` | `200` `"status":"active"` | lifecycle: `provisioning` → `active` |

`POST /api/sessions/personal` response body (trimmed):

```json
{
  "session": {
    "id": "G8aGrlP3kdFpZmp3Vy_s-",
    "title": "Mexico City",
    "repoOwner": "recoupable",
    "repoName": "sweetmantech-29april20261230pm-7059df5c-256f-428a-9817-37d17253ddae",
    "cloneUrl": "https://github.com/recoupable/sweetmantech-29april20261230pm-7059df5c-256f-428a-9817-37d17253ddae.git",
    "lifecycleState": "provisioning",
    "sandboxState": { "type": "vercel" }
  },
  "chat": { "id": "edhB8ykhSFDHNOJabbuJa", "modelId": "openai/gpt-5.4", "title": "New chat" }
}
```

Repo confirmed via GitHub API (`gh api repos/recoupable/sweetmantech-29april20261230pm-7059df5c-256f-428a-9817-37d17253ddae`):

- created_at: `2026-04-29T17:30:40Z`
- default_branch: `main`
- private: `true`
- contents: `README.md` (149 bytes) — the auto_init seed

UI behaviour: no "Select an Organization" empty state flashed; user landed directly in `/sessions/G8aGrlP3kdFpZmp3Vy_s-/chats/edhB8ykhSFDHNOJabbuJa` titled `Mexico City`. Sidebar shows `recoupable/<repo>` with one session. No error toast.

## Test 2 — agent inspection inside the sandbox

To prove the sandbox boots cleanly against the seeded repo, sent two prompts in the chat:

1. Repo state inspection (`ls -la`, `cat README.md`, `git log`, `git remote`, HEAD ref). Agent reported:
   - `total 4` with `.git/` and `README.md` (149B), owned by `vercel-sandbox`
   - README content: `# sweetmantech-29april20261230pm-7059df5c-256f-428a-9817-37d17253ddae` + the description from `ensurePersonalRepo`
   - `git log`: single commit `b5f8bc7 Initial commit` — GitHub's `auto_init` seed
   - `git remote -v` shows `origin` pointing at the personal repo URL for both fetch and push
   - `git rev-parse --abbrev-ref HEAD` → `main`

2. Open-ended "what's here, anything to set up?" — agent loaded the `/artist-workspace` global skill, listed the same single-file state, and recommended seeding `.gitignore`, `package.json`, scripts, etc. Confirms the skill machinery and chat loop work against a freshly provisioned personal sandbox.

## How to re-verify

1. Sign in to the preview with a never-seen email (e.g. `sweetmantech+<unique>@gmail.com`).
2. Watch the network tab — expect the four-row sequence above with all green statuses.
3. Confirm the new repo exists on GitHub at `recoupable/<kebab(name)>-<account_id>` with a single `Initial commit`.
4. Confirm the chat lands at `Send a message to get started` (no `Failed to provision sandbox` toast).
