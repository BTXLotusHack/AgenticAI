# Loopin Infrastructure Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one reviewed application branch and draft PR to `dev` so the infrastructure engineer can work from the proposed combined repository without merging or deploying anything.

**Architecture:** `codex/infra-handoff` remains based on the reviewed application history. `origin/dev` remains the owner of `backend/` and `infra/`. A draft GitHub PR composes them; a temporary synthetic merge tree verifies compatibility without merging either branch.

**Tech Stack:** Git/GitHub CLI, npm workspaces, Flutter 3.44.2/Dart 3.12.2, Node.js backend, Terraform static handoff documentation.

## Global Constraints

- Do not merge `origin/dev` into `codex/infra-handoff`.
- Do not merge, auto-merge or retarget the pull request.
- The pull request base is exactly `dev`; the head is exactly `codex/infra-handoff`.
- Do not run Terraform apply or create AWS resources.
- Do not restore `wip/aws-service-adapters-handoff`.
- Preserve the original `infra-be` history already on `dev`.
- Report security and validation gaps as blockers; do not describe scaffolding as deployment-complete.

---

### Task 1: Add the infrastructure deployment-readiness handoff

**Files:**
- Create: `docs/handoffs/infra-deployment-readiness.md`
- Modify: `docs/README.md`

**Interfaces:**
- Consumes: the audited `origin/dev` backend/Terraform tree and the approved handoff design.
- Produces: one engineer-facing blocker/verification document linked from the documentation index and PR body.

- [ ] **Step 1: Write the handoff document**

Record the exact branch/commit provenance, what each repository surface can currently do, the Critical and Important blockers from the read-only audit, the required Terraform/AWS validations, and the minimal secure deployment sequence. Include explicit statements that no AWS deployment has occurred and the PR must remain draft.

- [ ] **Step 2: Link the handoff from the docs index**

Add `Infrastructure Deployment Readiness Handoff` to `docs/README.md` under the design/handoff records.

- [ ] **Step 3: Verify documentation quality**

Run:

```powershell
rg -n "TBD|TODO|PLACEHOLDER|implement later|fill in" docs/handoffs/infra-deployment-readiness.md
git diff --check
```

Expected: the placeholder scan has no matches and `git diff --check` exits `0`.

- [ ] **Step 4: Commit**

```powershell
git add docs/README.md docs/handoffs/infra-deployment-readiness.md
git commit -m "docs(handoff): document infra deployment blockers"
```

### Task 2: Verify the feature branch and proposed dev result

**Files:**
- No tracked source changes expected.
- Temporary archive: `$env:TEMP/loopin-infra-handoff-validation-*`.

**Interfaces:**
- Consumes: `origin/dev`, `codex/infra-handoff`, root npm workspaces, `backend/`, and `apps/mobile`.
- Produces: fresh verification evidence for the PR description without changing either branch.

- [ ] **Step 1: Verify feature-branch application surfaces**

Run from the handoff worktree:

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd run contracts:check
npm.cmd run simulate -- --json
npm.cmd run mobile:format-check
npm.cmd run mobile:analyze
npm.cmd run mobile:test
```

Expected: every command exits `0`; the simulator retains `split:TRIP001:M003:M004`, POI001 selection, POI002 exclusion, `900 m` peak gap and final reconnection.

- [ ] **Step 2: Create a synthetic proposed-merge commit without updating a branch**

Run:

```powershell
$tree = (git merge-tree --write-tree origin/dev HEAD | Select-Object -First 1).Trim()
$commit = "Synthetic infra handoff validation" | git commit-tree $tree -p origin/dev -p HEAD
```

Expected: both values are 40-character Git object IDs and the current branch/HEAD are unchanged.

- [ ] **Step 3: Export and test the proposed merge**

Export `$commit` into a unique directory under `$env:TEMP`, then run:

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd run contracts:check

Push-Location backend
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --omit=dev
Pop-Location
```

Expected: application and backend gates exit `0`; backend reports 14 tests and zero production dependency vulnerabilities. Remove only the uniquely created temporary export after recording results.

- [ ] **Step 4: Record non-executable infrastructure gates**

Confirm no local Terraform CLI or AWS credentials were used. Keep `terraform fmt -check`, pinned-provider init/validate/security scan, reviewed plan, remote-state bootstrap and deployed smoke tests listed as unverified blockers.

### Task 3: Push and open the draft pull request

**Files:**
- No tracked changes.

**Interfaces:**
- Consumes: verified `codex/infra-handoff` and the handoff document.
- Produces: a remote branch and draft GitHub PR targeting `dev`.

- [ ] **Step 1: Confirm branch and base**

Run:

```powershell
git status --short --branch
git rev-parse --abbrev-ref HEAD
git rev-parse origin/dev
```

Expected: clean `codex/infra-handoff`; base resolves to the current fetched `origin/dev`.

- [ ] **Step 2: Push the feature branch**

```powershell
git push -u origin codex/infra-handoff
```

- [ ] **Step 3: Create the draft PR**

Create a PR with:

- base `dev`;
- head `codex/infra-handoff`;
- title `Infra handoff: integrate reviewed Loopin application`;
- draft status;
- body summarizing included application surfaces, local verification, explicit deployment blockers, no-AWS-deploy status and the handoff document link.

- [ ] **Step 4: Verify PR metadata**

Run `gh pr view --json url,isDraft,baseRefName,headRefName,state` and require `isDraft: true`, `baseRefName: dev`, `headRefName: codex/infra-handoff`, and `state: OPEN`.

