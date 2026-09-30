# Morselo Git Workflow & Version Control Practices

This document outlines the **Git Workflow** and engineering practices utilized in the Morselo project.

---

## 1. Branch Strategy & Feature Branch Workflow

Morselo follows a disciplined Git collaboration model:
- **Primary Branch (`master`)**: The stable production-ready branch reflecting verified, fully-tested code.
- **Feature Branches (`feature/<feature-name>`)**: Isolated branches created from `master` for discrete feature implementation, refactoring, or documentation enhancements.
- **Workflow Lifecycle**:
  1. Create a dedicated feature branch from updated `master`: `git checkout -b feature/<name>`
  2. Implement changes, test, and make atomic commits on the feature branch.
  3. Push feature branch to upstream: `git push -u origin feature/<name>`
  4. Perform pre-merge validation and merge into `master`: `git checkout master && git merge feature/<name>`
  5. Push synchronized `master` to `origin/master`: `git push origin master`
- **Remote Upstream**: `origin` (`https://github.com/usswethanithyacode/Morselo.git`).

---

## 2. Focused & Atomic Commits

Each commit in Morselo represents a single logical unit of work (such as an individual rubric concept or architecture upgrade):
- **Single Responsibility**: Commits do not bundle unrelated features together (e.g., JWT authentication was committed separately from password hashing and RBAC).
- **Self-Contained**: Every commit includes the necessary backend logic, model changes, dependency manifests (`package.json`, `package-lock.json`), and accompanying documentation.
- **Bisect-Friendly**: Because each commit leaves the repository in a working, compilable state, debugging and history traversal remain straightforward.

---

## 3. Pre-Commit Review & Quality Checklist

Before creating any commit, a strict pre-commit verification protocol is performed:

1. **Feature & Regression Testing**:
   - Live HTTP endpoint and database verification tests are executed.
   - Any scratch scripts used for testing are run from Antigravity's external scratch directory so temporary test code is never committed to the repo.

2. **Diff & Status Inspection**:
   - `git status` is checked to confirm only intended files are modified or staged.
   - `git diff` is reviewed to prevent unintended edits or debug statements.
   - `git diff --check` is run to verify there are no trailing whitespace errors or conflict markers.

3. **Secret Leak Prevention**:
   - Verification that no `.env` files, API keys, JWT secrets, passwords, or database connection strings are staged or tracked.

---

## 4. Secret Isolation & `.gitignore` Policy

Security is enforced at the version control boundary:
- **Ignored Files**:
  - `server/.env`: Contains private environment variables (`DATABASE_URL`, `MONGODB_URI`, `GEMINI_API_KEY`, `JWT_SECRET`).
  - `node_modules/`: Package dependencies.
  - `*.log`: Runtime and debug logs.
  - `dist/`, `.vite-temp`: Build artifacts.
  - SQLite database files (`*.db`, `*.sqlite`).
- **Placeholder Documentation**: Configuration templates in documentation (e.g., `docs/AUTHENTICATION.md`) strictly use generic placeholders (`JWT_SECRET=<your-secret>`) without exposing actual values.

---

## 5. Meaningful Commit Message Conventions

Commit messages use clear, imperative, descriptive summaries:

| Format / Pattern | Purpose | Real Morselo Example |
|---|---|---|
| `Add <feature>` | Introduces a new capability or architectural component | `Add JWT authentication and protected routes` |
| `Add <security layer>` | Enhances security mechanisms | `Add bcrypt password hashing for authentication` |
| `Add <authorization>` | Implements access control | `Add role-based authentication and authorization` |
| `Migrate <subsystem>` | Database or driver migration | `Migrate SQL ingredient catalog to PostgreSQL` |
| `Document and verify <concept>` | Formalizes documentation and verification | `Document and verify PostgreSQL SQL JOINs` |

---

## 6. Real Morselo Commit History Evidence

The following chronological commit sequence from `git log` demonstrates Morselo's disciplined, concept-by-concept progression:

```
* 0afe286 (HEAD -> master, origin/master, origin/HEAD) Document and verify PostgreSQL SQL JOINs
* a28a530 Add role-based authentication and authorization
* 3a18ab0 Add bcrypt password hashing for authentication
* c00553f Add JWT authentication and protected routes
* 6c07561 Add Sequelize SQL transaction workflow
* 21fe3eb Add Sequelize ORM for PostgreSQL catalog
* b39c4f4 Migrate SQL ingredient catalog to PostgreSQL
* 066d4d9 Add SQLite index for ingredient catalog
* 7d92d87 Add SQL ingredient filtering and sorting
* 7ed9638 Add SQLite ingredient catalog with relational JOIN
* 0bf6f9a Integrate MongoDB recipe storage and CRUD API
* 713e624 Add saved recipes management with edit and delete
* b679da8 Add backend request validation
* 8f23ec7 Improve frontend loading and error states
* 2de1cef Add saved recipes page and save flow
```

---

## 7. Working Tree Hygiene & Checkpoint Verification

After every pushed feature:
- `git status` verifies `nothing to commit, working tree clean`.
- `git status` confirms `Your branch is up to date with 'origin/master'`.
- All development dependencies and application assets remain in sync across both local and remote environments.
