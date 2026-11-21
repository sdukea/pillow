# Security and privacy

## Today (built)

- **No accounts, and no student data leaves the browser.** Evidence, notes
  and drafts live in `localStorage` on the student's device.
- **Students' code** runs in a Pyodide web worker in their own browser,
  with a 200,000-line step limit. It never reaches a server.
- **AI-drafted code** runs only in the Node permission sandbox
  (`engine/sandbox`):
  - `--permission` with no file or network grants;
  - an empty environment;
  - JavaScript modules blocked;
  - timeouts, with the process killed on a breach.

  Drafts are never executed anywhere else.
- **API keys:**
  - The Claude key is read from the server's environment only.
  - It's never stored in frontend code, the repo or caches.
  - The static site has no key.
- **Content:** AI drafts need five automated checks and a named human
  reviewer before publication.
- **Dependencies:** pinned in `package-lock.json`. Pyodide is pinned to an
  exact version.

## With accounts (P8, designed)

| Risk | Control |
|---|---|
| Account takeover | A managed auth provider; email magic links or OAuth; no passwords stored by us |
| Reading another student's data | Row-level security: every row is keyed by user ID and enforced in the database, not only the app |
| Evidence tampering | Accepted: evidence only affects the student's own map. Interview reports are signed server-side if they're ever shared |
| PII | Store an email and a display name only. No real names are required. Time zone and preferences only |
| Email abuse | Rate limits, one-click unsubscribe, honouring bounces and complaints |
| Secrets | Provider keys in the host's secret store; never in the client bundle; rotated on staff change |
| Data rights | Export everything as JSON; delete the account and all its rows on request |
| Migrating local data | Opt-in upload of the `localStorage` log at first sign-in; nothing is uploaded without consent |

## Rules for contributors

- Never execute untrusted or AI-generated code outside `engine/sandbox` or
  the browser worker.
- Never put keys in frontend code, the repo, logs or chat.
- Never copy LeetCode problem statements.
- Never fabricate problem identifiers, URLs or test results.
