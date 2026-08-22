# LIMS Mobile — Project Documentation

A mobile-first Laboratory Information Management System for a microbiology/general
testing lab: sample login, test result entry, multi-level QA approval, certificates
of analysis, barcode scanning, inventory, and audit trail.

- **Stack:** Next.js 16 (App Router, Server Actions), TypeScript, Tailwind CSS v4,
  Prisma ORM, PostgreSQL (Supabase), cookie/JWT session auth.
- **Design source:** implemented from a Claude Design handoff (`project/` folder —
  kept for reference, not part of the running app).

---

## 1. Getting started (local development)

You'll need Node.js 20+ and a PostgreSQL database (a free [Supabase](https://supabase.com)
project is the easiest way to get one).

```bash
npm install
```

Create a `.env` file (see `.env.example`):

```
DATABASE_URL="postgresql://...pooler.../postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...direct-connection.../postgres"
SESSION_SECRET="a long random string"
```

- `DATABASE_URL` — the **pooled** connection (Supabase: "Transaction pooler", port 6543).
  Used by the running app. `connection_limit=1` is recommended for serverless hosts.
- `DIRECT_URL` — the **direct** connection (port 5432). Only used by Prisma Migrate.

Apply the schema and seed demo data:

```bash
npx prisma migrate deploy
npm run db:seed
```

Run the app:

```bash
npm run dev
```

Open http://localhost:3000 and sign in with one of the [demo accounts](#4-demo-accounts).

---

## 2. Deploying (Vercel or Netlify)

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. Import it into Vercel/Netlify.
3. Set the same three environment variables as above in the project's settings.
4. Deploy — the `postinstall` script (`prisma generate`) runs automatically during
   the build.

**Performance tip:** set the deployment region to match your database's region
(this repo ships `vercel.json` pinned to `icn1`/Seoul to match the demo Supabase
project — change it to whichever region your own database is in). Database and
compute being far apart is the single biggest cause of a LIMS app "feeling slow."

---

## 2a. Updating an existing deployment

Each delivery after the first may add new database tables/columns. If you
already have a live Supabase project from an earlier delivery, apply whatever
migrations are new before deploying the new code:

- **Easiest:** run `npx prisma migrate deploy` from a machine with Node.js and
  your `DIRECT_URL` set — it applies only what's new (safe to run repeatedly;
  already-applied migrations are skipped).
- **No Node.js available:** open `prisma/migrations/`, sort by the timestamp
  prefix, and run the `migration.sql` of any folder you haven't applied yet
  (oldest first) in Supabase's SQL Editor.

This delivery adds two migrations on top of the last one:
- **Multi-reading test results** (`TestReading` table + `resultMode` columns —
  see [Section 5](#5-feature-walkthrough)).
- **Login lockout** (`failedLoginAttempts` / `lockedUntil` on `User` — see
  [Section 9](#9-security)).

Both are purely additive — existing rows keep working unchanged (new columns
default to "off"/zero), nothing to backfill.

---

## 3. Roles & permissions

| Access Role | Can do |
|---|---|
| **Technician** | Log in samples, enter test results, request retests, view everything |
| **Supervisor** | Everything a Technician can, plus: first-stage review (endorse/reject), manage Deviations |
| **QA Manager** | Everything a Supervisor can, plus: final approval, manage the Sample & Test Catalog, manage Inventory |
| **Admin** (Lab Manager) | Everything, plus: manage Users, view the Audit Log |

Every sample goes through: **Pending Login → In Testing → Awaiting Supervisor
Review → Awaiting QA Approval → Complete** (or **Rejected** at either review
stage, which automatically opens a Deviation record).

Approve/reject actions require the reviewer to **re-enter their password** as an
electronic signature — this is recorded in the Audit Log and in the sample's
Chain of Custody.

---

## 4. Demo accounts

Seeded by `npm run db:seed`. **Change these passwords (or deactivate these
accounts and create real ones) before giving real users access** — see
[Section 7](#7-before-you-go-live).

| Role | Email | Password |
|---|---|---|
| Technician | `a.wijaya@lab.local` | `lab1234` |
| Supervisor | `r.halim@lab.local` | `lab1234` |
| QA Manager | `r.kusuma@lab.local` | `lab1234` |
| Admin | `admin@lab.local` | `lab1234` |

You can also sign in with an Employee ID instead of email (e.g. `EMP-2087`).

---

## 5. Feature walkthrough

**Dashboard** — status counts, an overdue-samples banner (based on each sample
type's target turnaround time), a 7-day pass/reject rate, recent alerts, and
recent samples.

**Samples** — search (ID, type, source, or collector) + status filter pills +
a received-date range filter + CSV export of whatever is currently filtered.

**Sample detail** — sample info, target TAT / retention date, storage location
(editable), a barcode label (print/QR), chain of custody, tests with inline
result entry, the review panel (role-gated, password-signed), any open
Deviation, and a Retest button once a sample is Rejected.

**Test result entry — single or multi-reading** — each test definition in the
Catalog is either **Single result** (one value, like today) or **Multiple
Readings**, for tests that need duplo/triplo replicates and/or a schedule of
checkpoints (e.g. TPC read at 24h/48h/72h). For a multi-reading test, the entry
screen lets you log each raw reading (replicate #, checkpoint, value, who/when)
as you go — every reading is kept as audit-trail data — then you enter one
**Final Reported Result** yourself (the screen shows a suggested average as a
convenience, but you decide the number that actually gets reported, since some
methods use pharmacopoeial rules more involved than a plain average). That
final result is what flows into Supervisor/QA review and the COA, exactly like
a single-result test today. Raw readings are visible on the test's own page for
traceability, but are **not** printed on the customer-facing COA — the COA
only ever shows the one final result per parameter, to keep it clean.

**New Sample** — sample type is chosen from the **Sample & Test Catalog**
(Profile → Sample & Test Catalog), which auto-attaches that type's standard
tests.

**Scanner** — reads a QR/barcode with the device camera and jumps to that
sample; a manual Sample ID field is the fallback when a camera isn't available.

**Certificate of Analysis** — available once a sample is Complete. Laid out as
a formal, letterhead-style A4 document (not a screenshot of the app) —
certificate number, sample/testing details, a results table, an
Approved-for-Release banner, two signature blocks (Supervisor reviewer + QA
approver, pulled from the actual e-signed workflow), a verification QR code,
and a footer disclaimer — designed to fit one page. "Share / Export PDF" uses
the browser's native print-to-PDF, which works the same on desktop and mobile.

**Deviations** (Supervisor+) — every rejected sample gets a Deviation record;
record a root cause and CAPA, then close it.

**Catalog** (QA Manager+) — manage sample types (name, target TAT, retention
period) and their standard tests (name, unit, spec, method, and Result Mode —
Single or Multiple Readings with a replicate count and/or interval plan).

**Inventory** (QA Manager+) — reagents (stock, lot, expiry — flags low-stock
and expiring-soon) and equipment (status, calibration due date).

**Users** (Admin) — create accounts, assign an access role, deactivate/reactivate,
reset a forgotten password (a one-time temporary password is shown to the admin
to relay to the user).

**Audit Log** (Admin) — the most recent 100 system events (who did what, when).

**Notifications** — in-app only in this release (see [Section 6](#6-known-limitations)).

---

## 6. Known limitations

Scoped out of this release deliberately, not oversights:

- **Notifications are in-app only** — no email/push. The bell icon and Alerts
  tab are fully real; there's just no external delivery channel yet.
- **Single lab / single section** — no multi-department or multi-tenant support.
- **No offline mode** — the app needs connectivity (it's a thin client over
  Server Actions, not a PWA with offline sync).
- **Admin bootstrapping** — there's no self-serve "create the first admin"
  flow; the seed script creates one. If you wipe the database, reseed or
  create an Admin row directly.

---

## 7. Before you go live

- [ ] Change or remove the seeded demo accounts (Profile → Users, or directly
      in the database) — do **not** ship default passwords to real users.
- [ ] Set a strong, unique `SESSION_SECRET` in production (not the placeholder
      value from `.env.example`).
- [ ] Confirm Row Level Security is enabled on every table in Supabase (the
      app connects with the `postgres` role, which bypasses RLS, but RLS
      being on closes off the public REST API from exposing your tables).
- [ ] Review the Sample & Test Catalog — the seeded entries mirror one
      microbiology lab's test panel; adjust names/specs/TAT/retention to match
      yours.
- [ ] Decide on a real notification channel if in-app alerts aren't enough
      (see [Section 6](#6-known-limitations)).

---

## 9. Security

A full review was done before this release; what's in place, and what's
deliberately left as your responsibility to configure.

**Authentication**
- Sessions are a JWT in an `httpOnly`, `secure` (in production), `sameSite=lax`
  cookie — not readable or forgeable from client-side JS.
- Passwords are hashed with bcrypt (cost 10); temp passwords (new user /
  password reset) are generated with Node's `crypto.randomBytes`, not `Math.random`.
- **Login lockout:** 5 wrong passwords locks that account for 15 minutes
  (tracked in the database, so it holds even across serverless instances).
  Login failure messages are generic ("Invalid email/employee ID or
  password") whether the account doesn't exist or the password is wrong, so
  the login form can't be used to enumerate valid accounts.
- The app **refuses to start in production** (`NODE_ENV=production`) if
  `SESSION_SECRET` isn't set, instead of silently signing sessions with the
  public placeholder value from the source code — that placeholder must never
  reach production, since anyone who reads it could forge a session for any
  user, including Admin.

**Authorization**
- Every Server Action re-checks the caller's role itself (`requireRole(...)`)
  — a page being hidden from a role in the UI is never the only thing
  stopping that role from calling the underlying action directly.
- Actions that mutate a specific record (readings, deviations, reagents…)
  verify the record actually belongs to the parent you claim it does before
  touching it, not just that *a* record with that id exists.

**Input handling**
- All database access goes through Prisma's parameterized queries — no
  string-built SQL anywhere in the app.
- CSV export (Samples → Export CSV) neutralizes leading `=`/`+`/`-`/`@` in any
  cell, so a value typed into a free-text field (Source, Collected By…)
  can't turn into an executing formula when the file is later opened in
  Excel/Sheets ("CSV injection").
- No `dangerouslySetInnerHTML` / `eval` anywhere in the codebase.

**Transport / headers**
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy`
  that only allows camera access (needed for Scan) are set on every response.

**Left as your responsibility**
- [ ] **Supabase Row Level Security** — see the [Section 7](#7-before-you-go-live)
      checklist; the app's own DB role bypasses RLS, but RLS should still be
      on so the public REST API can't expose your tables.
- [ ] **Rotate the demo passwords / SESSION_SECRET** before real use (Section 7).
- [ ] A Content-Security-Policy header was deliberately **not** added — this app
      renders data: URIs (QR codes) and would need real testing across every
      screen to get a CSP right without breaking something; ship one only
      after testing it yourselves against your actual deployment.
- [ ] Rate limiting exists only on login. Admin-only actions (create user,
      reset password, etc.) are already restricted to the Admin role, so the
      exposure is lower, but there's no additional throttling on them.

---

## 10. Data model (high level)

- `User` — account + `accessRole` (Technician/Supervisor/QA Manager/Admin) + `active`
  + login-lockout tracking (`failedLoginAttempts`, `lockedUntil`)
- `Sample` — one physical sample; `status` drives the whole workflow
- `Test` — one test on a sample (name/unit/spec/**final** result/status); carries
  a `resultMode` snapshot (Single/Multi) copied from the catalog at creation time
- `TestReading` — one raw reading on a Multi-mode test (replicate #, checkpoint
  label, value, who/when) — supporting data behind a Test's final result
- `CustodyEvent` — timestamped chain-of-custody entries for a sample
- `SampleTypeCatalog` / `TestCatalog` — the configurable catalog New Sample draws
  from; `TestCatalog` also holds each test's `resultMode` / `replicateCount` /
  `intervalPlan` configuration
- `Deviation` — OOS record opened automatically on rejection
- `Reagent` / `Equipment` — inventory
- `Notification` — in-app alerts
- `AuditLog` — system-wide activity log

See `prisma/schema.prisma` for the full definitions.
