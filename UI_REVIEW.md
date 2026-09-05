# UI Review — LIMS Zekindo

**Tanggal:** 27 Agustus 2026
**Repo:** lims-zekindo (main, sudah merge PR #21)
**Fokus:** Komponen client React (UX, state management, accessibility, edge cases)

---

## 🟠 TINGGI

### UI-001: `SamplesClient` — Select status desktop tidak self-contained (controlled oleh prop, bukan state)

**File:** `src/components/SamplesClient.tsx:233`

```tsx
<select value={initialStatus} onChange={(e) => setStatusFilter(e.target.value)} ...>
```

`value` di-ikat ke **prop** `initialStatus`, bukan `useState`. `onChange` → `router.replace` (server round-trip) → baru prop berubah. Ini berarti:
- Ada **delay/lag** antara klik dan perubahan visual (nunggu server)
- Kalau server round-trip gagal (offline/error), select **tetap di nilai lama** — user tidak dapat feedback
- Pattern "controlled by prop + server round trip" rapuh untuk filter UI

**Sebaiknya:** pakai `useState` lokal + sync ke URL (pattern yang sama dengan `query`/`dateFrom` yang sudah pakai state lokal di komponen ini).

---

### UI-002: Mobile grouping "Today/Yesterday/Earlier" tidak reset saat filter berubah

**File:** `src/components/SamplesClient.tsx:198-203`

```ts
const groups = useMemo(() => {
  return DAY_GROUP_ORDER.map(...)...
}, [samples]);
```

Grouping berdasarkan receivedDate, **tapi** saat filter status aktif (misal hanya "Rejected"), grouping tetap menampilkan label "Today"/"Yesterday"/"Earlier". Ini **confusing** karena user filter status, bukan tanggal — grouping seharusnya disembunyikan/disederhanakan saat filter non-All aktif.

---

### UI-003: Export CSV hanya data halaman ini (bukan semua hasil filter)

**File:** `src/components/SamplesClient.tsx:258-269` (desktop) & `:412-417` (mobile)

`downloadCsv(samples)` hanya mengekspor **samples yang sedang tampil di halaman** (1 halaman ≈ 15-25 baris), bukan seluruh hasil filter. Label tombol bahkan bilang "Export CSV (current page)". Ini **bukan bug tersembunyi** — sudah didokumentasikan di title. Tapi user bisa salah paham (mikir export semua). Produk lain (inventory) sudah punya export server-side uncapped (`EXPORT_CAP`); samples belum konsisten.

---

## 🟡 SEDANG

### UI-004: `StatusBadge` menampilkan status mentah (string panjang) — inconsistent dgn SamplesClient yang pakai `SAMPLE_STATUS_SHORT`

**File:** `src/components/StatusBadge.tsx:10`

```tsx
{status}
```

Menampilkan status penuh: "Awaiting Supervisor Review" — panjang & wrap di UI sempit. Komponen lain pakai `SAMPLE_STATUS_SHORT` ("Awaiting Supervisor"). StatusBadge dipakai di mana? Perlu dicek — kalau dipakai di card kecil, jadi overflow.

---

### UI-005: `TestResultForm` — input numerik menolak koma desimal di UI

**File:** `src/components/TestResultForm.tsx:63`

```ts
let v = raw.replace(/[^0-9.]/g, "");  // hanya titik, koma dihapus
```

Ini **konsisten** dengan fix PR #21 (backend sekarang terima koma), tapi **frontend masih buang koma** sebelum dikirim. User Indonesia yang mengetik `0,5` di form → koma di-strip → `05` → salah! Ini membuat fix backend #21 tidak berguna untuk input langsung (hanya berguna untuk import/paste).

**Fix:** ganti `.replace(/[^0-9.]/g, "")` → juga terima koma, atau konversi koma ke titik sebelum setState.

---

### UI-006: `WarehouseViewSwitch` — tombol List/Hierarchy width fixed 92px

**File:** `src/components/WarehouseViewSwitch.tsx:26-36`

`w-[92px]` di-hardcode. Kalau label berubah/terjemahan/longer, layout rusak. Minor, tapi fragile.

---

### UI-007: `NotificationsBell` — `markAllRead` tidak optimistik rollback

**File:** `src/components/NotificationsBell.tsx:28-32`

```ts
async function markAllRead() {
  setNotifications((prev) => prev?.map((n) => ({ ...n, unread: false })) ?? null);
  await markAllReadAction();
  router.refresh();
}
```

State di-update duluan (optimistic) tapi kalau `markAllReadAction` gagal, tidak ada rollback — UI bilang "all read" padahal server masih unread (sampai refresh). Minor karena router.refresh() setelahnya.

---

### UI-008: `TestReadingsPanel` — `replicateIndex` render pakai truthy check

**File:** `src/components/TestReadingsPanel.tsx:67`

```tsx
{r.replicateIndex && <span> · Rep {r.replicateIndex}</span>}
```

Kalau `replicateIndex = 0` (mungkin dari API), tidak tampil karena 0 falsy. Tapi di form, replicate dimulai dari 1 (`value={i + 1}`), jadi praktis tidak terjadi. Minor.

---

### UI-009: `GlobalSearchMobileButton` — full-screen modal tidak ada tombol close kecuali back-arrow; keyboard Escape tidak ditangani di mobile

**File:** `src/components/GlobalSearch.tsx:157-185`

Back arrow ada, OK. Tapi `useDebouncedSearch` dipakai 2x (desktop + mobile) — query state terpisah, tidak sync. User cari di desktop, buka mobile → query hilang. Minor.

---

## 🟢 RENDAH / CATATAN

### UI-010: `ReviewPanel` — error approve & reject ditampilkan bersama (satu state error dari dua form)

**File:** `src/components/ReviewPanel.tsx:63-65`

```tsx
{(approveState.error || rejectState.error) && (
  <div>{approveState.error || rejectState.error}</div>
)}
```

Dua form (approve & reject) masing-masing punya `useActionState` sendiri. Error dari approve muncul duluan kalau dua-duanya error (approveState.error menang). Tidak masalah besar karena hanya 1 aksi per klik.

### UI-011: Skeleton components — loading state konsisten? (perlu dicek runtime)

### UI-012: `dayGroupLabel` pakai `now.getTime() - 24h` untuk yesterday — bisa salah saat DST (Indonesia tidak ada DST, aman)

---

## Ringkasan Prioritas

| Severity | Jumlah | Kunci |
|---|---|---|
| 🟠 Tinggi | 3 | UI-001 (select controlled prop), UI-002 (grouping saat filter), UI-005 (**koma di frontend!**) |
| 🟡 Sedang | 6 | UI-004, 006, 007, 008, 009 |
| 🟢 Rendah | 3 | UI-010, 011, 012 |

**Paling penting untuk fix:**
1. **UI-005** — koma desimal di form input (frontend buang koma, backend sudah terima) — ini bikin PR #21 fix-nya tidak nyambung untuk input manual
2. **UI-001** — select status desktop sebaiknya pakai state lokal
3. **UI-002** — grouping mobile saat filter status aktif membingungkan
