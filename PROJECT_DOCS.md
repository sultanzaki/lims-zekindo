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

## 1a. Attachment storage (Supabase Storage)

Test result entry supports attaching a photo or Excel/CSV file as supporting
documentation. This uses Supabase Storage, which is separate from the
database connection above — set it up once per project:

1. In your Supabase project, go to **Storage** and create a new **private**
   bucket (the app never exposes a public bucket URL — it reads files back
   through short-lived signed URLs it generates on the server).
2. Go to **Project Settings → API** and copy the **Project URL** and the
   **`service_role`** secret key.
3. Add to `.env` (see `.env.example`):

```
SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
# SUPABASE_STORAGE_BUCKET="test-attachments"   # only if you named the bucket differently
```

The `service_role` key bypasses Row Level Security — it's used server-side
only (in `src/lib/storage.ts`) and must never be exposed to the browser or
committed to source control. Without these two variables set, the
attachment upload form still renders but shows a clear inline error instead
of crashing the page — everything else in the app works normally.

**Troubleshooting "bucket not found":** the upload error now includes the
exact bucket name it tried (e.g. `bucket: "test-attachments"`) — check that
against the bucket list in Supabase **Storage**. This almost always means
one of:

- The bucket name doesn't match exactly (case-sensitive) — rename the
  bucket or set `SUPABASE_STORAGE_BUCKET` to the real name.
- A leftover `SUPABASE_STORAGE_BUCKET` variable (in `.env` or in
  Vercel/Netlify's project settings) still points at an old/renamed bucket
  name — remove it if you're using the default `test-attachments`.
- `SUPABASE_URL` points at a different Supabase project than the one where
  the bucket was created (easy to mix up if you have more than one
  project) — compare the project ref in `SUPABASE_URL` against
  `DATABASE_URL`.
- On Vercel/Netlify, environment variable changes only take effect on the
  **next deploy** — re-deploy after adding or editing them.

---

## 2. Deploying (Vercel or Netlify)

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. Import it into Vercel/Netlify.
3. Set the same environment variables as above (including the Supabase Storage
   ones from §1a, if you want attachments to work) in the project's settings.
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

This delivery adds three migrations on top of the last one:
- `BusinessUnit`, `StorageLocation` (the Warehouse catalog), `EquipmentEvent`,
  `ReagentTransaction`, plus new columns on `Sample` (`requestorName`,
  `businessUnitId`), `Equipment` (`locationId`), and `Reagent` (`category`,
  `locationId`) — see [Section 5a](#5a-latest-additions).
- `Sample.accessCode` — the random code that gates the public tracking
  portal — see [Section 5b](#5b-public-tracking-portal--analytics).
- `StorageLocation.parentId` — lets a warehouse location nest under another
  one; also swaps `StorageLocation.name`'s uniqueness from globally-unique to
  unique-per-parent — see [Section 5c](#5c-multi-level-warehouse-barcodes-for-everything-calendar-and-bi).

All three are purely additive — existing rows keep working unchanged (new
columns default to null or, for `Reagent.category`, `"Reagent"`), nothing to
backfill. `Equipment.location` / `Reagent.location` (the old free-text
fields) are kept as a fallback display for rows that predate the Warehouse
feature and haven't been assigned a structured location yet. Samples created
before this update won't have an `accessCode`, so the tracking portal can't
look them up — that's fine, they just fall outside the feature, same as
Sample Name did when it was first added. Existing `StorageLocation` rows
default to `parentId = null` (top-level), so nothing already in your
warehouse catalog moves or gets reorganized.

**This delivery adds one more migration** on top of those three:
`SampleReport` — the new per-sample Report document, separate from the
per-test attachments — see [Section 5d](#5d-business-unit-page-body-size-fix-warehouse-tree-view-barcode-print-fix-and-sample-reports).
Also purely additive, nothing to backfill.

> This session's sandbox could not reach your Supabase database directly
> (only outbound HTTPS is allowed here, not raw Postgres connections), so
> this migration has **not** been applied to your production database yet —
> run it yourself using either option above before deploying this code.
> The file is `prisma/migrations/20260824035857_sample_reports/migration.sql`:
> ```sql
> CREATE TABLE "SampleReport" (
>     "id" TEXT NOT NULL,
>     "sampleId" TEXT NOT NULL,
>     "fileName" TEXT NOT NULL,
>     "fileType" TEXT NOT NULL,
>     "fileSize" INTEGER NOT NULL,
>     "storagePath" TEXT NOT NULL,
>     "uploadedBy" TEXT NOT NULL,
>     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
>     CONSTRAINT "SampleReport_pkey" PRIMARY KEY ("id")
> );
> CREATE INDEX "SampleReport_sampleId_idx" ON "SampleReport"("sampleId");
> ALTER TABLE "SampleReport" ADD CONSTRAINT "SampleReport_sampleId_fkey"
>   FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
> ```

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

**Test entry attachments** — while a test is still pending, you can attach a
photo or Excel/CSV file as supporting documentation for the observation
(e.g. a photo of a plate count, a raw data export). Files are stored in
Supabase Storage (see §1a) and shown read-only on the sample's Results tab
afterward, so Supervisors/QA can view them during review — attachments lock
along with the rest of the test once a result is submitted.

**New Sample** — every sample gets a required **Sample Name** (a human-readable
description, e.g. "Bottled Drinking Water 600ml" — distinct from Sample ID and
Sample Type) alongside the sample type, which is chosen from the **Sample &
Test Catalog** (Profile → Sample & Test Catalog) and auto-attaches that type's
standard tests. The name shows up everywhere the sample does afterward —
Samples list, Dashboard, sample detail, the barcode label, and the COA.

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

**Inventory** (QA Manager+) — reagents & chemicals and equipment, each with
their own detail page and full history — see [Section 5a](#5a-latest-additions).

**Users** (Admin) — create accounts, assign an access role, deactivate/reactivate,
reset a forgotten password (a one-time temporary password is shown to the admin
to relay to the user).

**Audit Log** (Admin) — the most recent 100 system events (who did what, when).

**Notifications** — in-app only in this release (see [Section 6](#6-known-limitations)).

---

## 5a. Latest additions

**Timezone — everything is WIB (Asia/Jakarta, UTC+7)** — every date/time shown
in the app (`src/lib/format.ts`) is formatted in Jakarta local time regardless
of the server's or viewer's own timezone, and is labeled "WIB" wherever a time
is shown. The Collection Date & Time field on New Sample also *defaults to and
parses as* Jakarta time (`src/lib/tz.ts`), so what a technician types there
means the same instant no matter where the app happens to be deployed.

**Requestor & Business Unit** — every sample now carries a Requestor (free
text, defaults to the logged-in user) and a Business Unit (a fixed list
managed by QA Manager+/Admin under Profile → Sample & Test Catalog →
Business Units — same pattern as Sample Types). Both flow through to the
sample's Details tab and the Certificate of Analysis.

**Photo carousel & gated document downloads (Results tab)** — a test's photo
attachments now show as a swipeable carousel with a tap-to-expand full-screen
viewer (dot indicators when there's more than one). Non-image files
(Excel/CSV) are listed separately and are only downloadable by
Supervisor/QA Manager/Admin — a Technician sees the file name with a lock
icon instead of a working link.

**Equipment** (QA Manager+) — beyond the list, each piece of equipment now
has its own detail page: current status with a reason-logged status-change
form, a calibration form (next-due date, result notes, optional certificate
file upload), a maintenance form (what was done, optional attachment), and a
full chronological history of every calibration/maintenance/status event —
not just a single "last calibrated" date that gets overwritten each time.

**Reagents & Chemicals** (QA Manager+) — renamed from "Reagents" since it now
also tracks general lab chemicals and consumables (a Category field: Reagent,
Chemical, Media, Consumable). Each item has its own detail page with a full
stock movement ledger — Receive / Consume / Adjust / Dispose, each with a
reason and running balance — instead of a single quantity field that silently
overwrites with no record of what changed or why.

**Warehouse** (QA Manager+, Profile → Warehouse) — a shared catalog of
physical storage locations. Reagents and Equipment are assigned a location
from this list instead of typing free text, so every location can be opened
to see everything stored there in one place — the actual "where is
everything" view the lab asked for.

**Mobile top bar cleanup** — the plain logo+bell utility bar that used to sit
above the page title on Samples/Scan/Alerts/Profile has been removed; the
page title is now the topmost element on mobile, matching the Dashboard's
already-clean header. Desktop is unaffected (it never had that bar).

**Favicon & browser chrome color** — the browser tab now shows a "Z" mark
instead of the generic default, and the address bar/tab accent color was
already set to the brand teal (`#2b8db8`) — confirmed unchanged.

---

## 5b. Public tracking portal & analytics

**Public sample tracking** (`/track`, no login) — every sample gets a random
8-character Access Code (`Sample.accessCode`, distinct from the sequential,
guessable Sample ID) at creation. A requestor enters the Sample ID *and* the
Access Code at `/track` to see a status timeline (Received → Testing In
Progress → Under Review → Completed) plus basic sample info — never raw test
results before the sample is Complete, and never any other party's data,
since the ID alone is never enough. Once Complete, the portal links to a
public, read-only view of the Certificate of Analysis at
`/track/certificate`. Staff find a sample's Access Code and a ready-to-share
tracking link (with a one-tap copy button) on the sample's Details tab,
under "Requestor tracking" — that's the only place it's surfaced; there's no
separate "send to requestor" notification yet (see
[Section 6](#6-known-limitations)).

A wrong ID/code combination and a *valid* ID with the *wrong* code both show
the exact same generic error ("Sample ID or Access Code is incorrect") — the
same anti-enumeration pattern already used on the staff login form, so the
portal never confirms or denies that a given Sample ID exists.

**Analytics** (Supervisor/QA Manager/Admin, Profile → Analytics) — a
dashboard of KPI tiles (samples this month, TAT compliance, pass rate, open
& overdue, equipment/reagent alerts) plus charts: sample volume trend,
pass/reject trend, TAT compliance by sample type, current status
distribution, volume by sample type and by Business Unit, deviation trend,
and equipment/reagent stock health meters. Two-column on desktop, stacked on
mobile. A Technician account is redirected away from `/analytics` the same
way it's blocked from Inventory/Catalog.

---

## 5c. Multi-level warehouse, barcodes for everything, calendar, and BI

**Nested warehouse locations** — `StorageLocation` now has a `parentId`
self-relation, so a location can nest arbitrarily deep (e.g. "KBI" >
"Microbiology Lab" > "Rak X"). The Warehouse list shows only top-level
locations; opening one shows a breadcrumb, its direct sub-locations, and the
reagents/equipment stored directly in it. "Add Location" on the root page
lets you place a new location anywhere in the tree via a parent dropdown; on
a location's own page, "Add Sub-location" is pre-scoped to that location.
Reagent/Equipment location pickers show the full indented tree so you can
tell locations with the same short name (e.g. two different "Rak A"s) apart.

**Barcodes beyond samples** — Equipment, Reagents/Chemicals, and Warehouse
locations each get a "Print Barcode Label" page now (same QR + print
pattern as the sample label). Their QR codes encode the full in-app path
(e.g. `/inventory/equipment/<id>`) rather than a bare ID, so the Scan page
(now titled "Scan Barcode") routes any of the four entity types to the
right page automatically. Older, already-printed sample labels (which
encode just the bare Sample ID) still work — the scanner falls back to
`/samples/<id>` for any scanned text that isn't a path.

**TAT Calendar** (`/calendar`, all roles) — a month view of every open
sample's TAT due date, in Jakarta local time. Red dot = something overdue
that day, amber = due but not yet overdue. Tapping a day lists its samples
with a direct link into each one.

**Advanced Insights** (`/analytics/insights`, same roles as Analytics) —
three panels, each a plain statistical calculation rather than a trained
model:
- *TAT prediction by sample type*: historical average turnaround (last 20
  completed samples of that type), scaled up when the lab's current open
  queue is heavier than a baseline depth.
- *Result anomalies*: a result submitted in the last 30 days is flagged if
  it's more than 2.5 standard deviations from that test's own historical
  mean (needs at least 5 prior numeric results for that test name to have a
  baseline at all).
- *Technician performance*: mined from `AuditLog` (the only record of who
  submitted a result — `Test` itself carries no technician reference).
  On-time rate compares each submission's timestamp to its sample's TAT
  deadline; out-of-spec rate only counts tests with a comparable
  numeric/exact spec.

---

## 5d. Business Unit page, body size fix, warehouse tree view, barcode print fix, and Sample Reports

**Business Units moved out of the Catalog page** — managing Business Units
is now its own page, `/admin/business-units` (Profile → Lab Management →
Business Units), separate from `/admin/catalog` (Sample & Test Catalog).
Nothing about the `BusinessUnit` data itself changed — a sample's Business
Unit field on the New Sample form still works the same way — this only
splits the *management* screen so it's not mixed in with sample-type/test
definitions.

**Fixed: attachment upload failing above 1MB** — Next.js caps Server Action
request bodies at 1MB by default, which was rejecting any file upload over
that size with `Body exceeded 1 MB limit` before the app's own 10MB check
ever ran. `next.config.ts` now sets `experimental.serverActions.bodySizeLimit`
to `10mb` to match.

**Warehouse: hierarchy tree view** — `/inventory/warehouse` now renders the
*entire* nested tree in one view (e.g. KBI → Microbiology Lab → Rak X, all
visible at once with indentation and connector lines and a distinct icon per
level: building / room / rack), instead of showing only top-level locations
and requiring a click-through per level. Opening a location's own page still
works the same as before, for adding a sub-location or printing its label.

**Barcode labels: top-left print alignment + Zekindo logo** — every barcode
label (Sample, Equipment, Reagent, Warehouse location) now prints flush to
the top-left corner of the A4 sheet, so it can be trimmed out with one
horizontal and one vertical cut instead of guessing where the margins are.
On screen the label preview still centers itself for a nicer mobile view —
only the print output changed. Each label card also now shows the Zekindo
Chemicals logo above its QR code.

**Sample Reports** — a new document type, `SampleReport`, distinct from the
per-parameter documentation (`TestAttachment`) shown under each test result.
A Report is one finished document for the *whole sample* (e.g. a signed-off
PDF report written outside the system), uploaded from the new "Report" panel
at the top of a sample's Results tab. Any signed-in user can upload one;
removing one is restricted to Supervisor/QA Manager/Admin. Once a sample
reaches **Complete**, its Report(s) also appear on the public client
tracking page (`/track`) as downloadable files, following the same
disclosure timing as everything else there — nothing is shown to the
requestor before the sample has cleared review.

---

## 6. Known limitations

Scoped out of this release deliberately, not oversights:

- **Notifications are in-app only** — no email/push. The bell icon and Alerts
  tab are fully real; there's just no external delivery channel yet.
- **Tracking link isn't auto-sent** — staff copy and relay the Access
  Code/link to the requestor manually (e.g. by email, chat, or a printed
  label); there's no automatic "send tracking link" delivery yet.
- **Sample Name has no edit UI yet** — it's set once at New Sample and can't
  be changed afterward from the app (a database update is the only way, e.g.
  for the samples that existed before this field was added).
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
- `Sample` — one physical sample; `status` drives the whole workflow; `name`
  is the human-readable description set at intake (nullable — samples from
  before this field existed just fall back to showing their type);
  `accessCode` gates the public tracking portal (see §5b)
- `Test` — one test on a sample (name/unit/spec/**final** result/status); carries
  a `resultMode` snapshot (Single/Multi) copied from the catalog at creation time
- `TestReading` — one raw reading on a Multi-mode test (replicate #, checkpoint
  label, value, who/when) — supporting data behind a Test's final result
- `TestAttachment` — a photo/Excel/CSV file attached to a Test as supporting
  documentation; stores metadata + a Supabase Storage path (see §1a), not the
  file itself
- `CustodyEvent` — timestamped chain-of-custody entries for a sample
- `SampleTypeCatalog` / `TestCatalog` — the configurable catalog New Sample draws
  from; `TestCatalog` also holds each test's `resultMode` / `replicateCount` /
  `intervalPlan` configuration
- `BusinessUnit` — the configurable Business Unit list a sample's requestor
  belongs to (`Sample.requestorName` itself is free text)
- `Deviation` — OOS record opened automatically on rejection
- `Reagent` / `Equipment` — inventory; each links to a `StorageLocation`
  (`locationId`) instead of free text going forward
- `ReagentTransaction` — one stock movement (Receive/Consume/Adjust/Dispose)
  against a Reagent, with the running balance after it applied
- `EquipmentEvent` — one calibration/maintenance/status-change event against
  a piece of Equipment, with an optional certificate/attachment
- `StorageLocation` — the Warehouse catalog: physical locations shared by
  Reagents and Equipment
- `Notification` — in-app alerts
- `AuditLog` — system-wide activity log

See `prisma/schema.prisma` for the full definitions.
