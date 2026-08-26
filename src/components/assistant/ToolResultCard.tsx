"use client";

import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/format";
import { STATUS_STYLES, SAMPLE_STATUS_SHORT, type SampleStatus } from "@/lib/status";

// Kept as a plain top-level helper (not inlined in the component body) so
// the "components must be pure" lint rule doesn't see a literal Date.now()
// call inside render — same pattern as lib/format.ts's dueLabelFor.
function isPast(date: Date | null): boolean {
  return date ? date.getTime() < Date.now() : false;
}

type Badge = { label: string; bg: string; color: string };
type Row = { key: string; primary: string; secondary?: string; badge?: Badge; trailing?: string; href?: string };

const TONE = {
  success: { bg: "#E6F4EA", color: "#1E7A34" },
  danger: { bg: "#FDECEA", color: "#B00016" },
  warning: { bg: "#FEF3E0", color: "#9A6100" },
  neutral: { bg: "#EEF2F5", color: "#5B6B74" },
  primary: { bg: "#E8F4FA", color: "#1A5F7A" },
} as const;

function sampleBadge(status: string): Badge {
  const style = STATUS_STYLES[status as SampleStatus];
  return style
    ? { label: SAMPLE_STATUS_SHORT[status as SampleStatus] ?? status, bg: style.bg, color: style.color }
    : { label: status, ...TONE.neutral };
}

function isErrorResult(result: unknown): result is { error: string } {
  return !!result && typeof result === "object" && "error" in result && typeof (result as { error: unknown }).error === "string";
}

// ---------- shared primitives ----------

function CardShell({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-soft bg-chip-bg/60">
        <span className="text-[11px] font-bold text-text uppercase tracking-wide">{title}</span>
        {typeof count === "number" && <span className="text-[10px] font-bold text-muted font-mono-data">{count}</span>}
      </div>
      <div className="flex flex-col divide-y divide-border-soft max-h-[260px] overflow-y-auto">{children}</div>
    </div>
  );
}

function RowLine({ row, onNavigate }: { row: Row; onNavigate: () => void }) {
  const content = (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-text truncate">{row.primary}</div>
        {row.secondary && <div className="text-[10.5px] text-muted truncate">{row.secondary}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {row.trailing && <span className="text-[10.5px] font-mono-data text-muted">{row.trailing}</span>}
        {row.badge && (
          <span
            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: row.badge.bg, color: row.badge.color }}
          >
            {row.badge.label}
          </span>
        )}
      </div>
    </div>
  );
  if (row.href) {
    return (
      <Link href={row.href} onClick={onNavigate} className="block hover:bg-chip-bg transition-colors">
        {content}
      </Link>
    );
  }
  return content;
}

function ListCard({ title, count, rows, emptyText, onNavigate }: { title: string; count?: number; rows: Row[]; emptyText: string; onNavigate: () => void }) {
  return (
    <CardShell title={title} count={count}>
      {rows.length === 0 ? (
        <div className="px-3 py-4 text-[11.5px] text-muted text-center">{emptyText}</div>
      ) : (
        rows.map((r) => <RowLine key={r.key} row={r} onNavigate={onNavigate} />)
      )}
    </CardShell>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: keyof typeof TONE }) {
  const style = tone ? TONE[tone] : TONE.neutral;
  return (
    <div className="flex-1 min-w-[84px] rounded-[10px] px-2.5 py-2" style={{ background: style.bg }}>
      <div className="text-[15px] font-bold font-mono-data" style={{ color: style.color }}>
        {value}
      </div>
      <div className="text-[9.5px] font-semibold text-muted uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

// ---------- per-tool renderers ----------

type Ctx = { onNavigate: () => void };

function renderSampleRows(samples: Array<Record<string, unknown>>): Row[] {
  return samples.map((s) => {
    const id = String(s.id);
    const status = typeof s.status === "string" ? s.status : "";
    const hoursOverdue = typeof s.hoursOverdue === "number" ? s.hoursOverdue : null;
    return {
      key: id,
      primary: (s.name as string) || id,
      secondary: [s.type, id].filter(Boolean).join(" · "),
      badge: sampleBadge(status),
      trailing: hoursOverdue !== null ? `${hoursOverdue}h late` : s.receivedDate ? formatDate(String(s.receivedDate)) : undefined,
      href: `/samples/${id}`,
    };
  });
}

function AnalyticsSummaryCard({ result, ctx }: { result: Record<string, unknown>; ctx: Ctx }) {
  const kpi = (result.kpi as Record<string, unknown>) ?? {};
  const anomalies = (result.anomalies as Array<Record<string, unknown>>) ?? [];
  const pct = (v: unknown) => (typeof v === "number" ? `${v}%` : "—");
  return (
    <div className="bg-white border border-border rounded-[14px] overflow-hidden">
      <div className="px-3 py-2 border-b border-border-soft bg-chip-bg/60">
        <span className="text-[11px] font-bold text-text uppercase tracking-wide">Analytics Summary</span>
      </div>
      <div className="p-2.5 flex flex-wrap gap-2">
        <StatTile label="TAT Compliance" value={pct(kpi.tatComplianceRate)} tone={typeof kpi.tatComplianceRate === "number" && kpi.tatComplianceRate < 80 ? "danger" : "success"} />
        <StatTile label="Pass Rate" value={pct(kpi.passRate)} tone={typeof kpi.passRate === "number" && kpi.passRate < 90 ? "warning" : "success"} />
        <StatTile label="Overdue Open" value={String(kpi.overdueOpenCount ?? 0)} tone={Number(kpi.overdueOpenCount ?? 0) > 0 ? "danger" : "success"} />
        <StatTile label="Equip. Overdue" value={String(kpi.equipmentOverdue ?? 0)} tone={Number(kpi.equipmentOverdue ?? 0) > 0 ? "warning" : "success"} />
        <StatTile label="Reagent Alerts" value={String(kpi.reagentAlertCount ?? 0)} tone={Number(kpi.reagentAlertCount ?? 0) > 0 ? "warning" : "success"} />
      </div>
      {anomalies.length > 0 && (
        <div className="border-t border-border-soft">
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-muted uppercase tracking-wide">Top anomalies</div>
          <div className="flex flex-col divide-y divide-border-soft max-h-[160px] overflow-y-auto">
            {anomalies.map((a, i) => (
              <Link
                key={i}
                href={`/samples/${a.sampleId}`}
                onClick={ctx.onNavigate}
                className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-chip-bg transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-text truncate">{String(a.testName)}</div>
                  <div className="text-[10.5px] text-muted truncate">{String(a.sampleId)} · result {String(a.result)}</div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: TONE.warning.bg, color: TONE.warning.color }}>
                  z={String(a.zScore)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ToolResultCard({ tool, result, onNavigate }: { tool: string; result: unknown; onNavigate: () => void }) {
  if (isErrorResult(result)) {
    return <div className="text-[11.5px] text-danger bg-danger-bg border border-danger/25 rounded-[12px] px-3 py-2">{result.error}</div>;
  }
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const ctx: Ctx = { onNavigate };

  switch (tool) {
    case "get_overdue_samples":
      return <ListCard title="Overdue Samples" count={r.count as number} rows={renderSampleRows((r.samples as Array<Record<string, unknown>>) ?? [])} emptyText="Nothing overdue right now." onNavigate={onNavigate} />;

    case "list_samples":
      return (
        <ListCard
          title="Samples"
          count={r.totalMatching as number}
          rows={renderSampleRows((r.samples as Array<Record<string, unknown>>) ?? [])}
          emptyText="No matching samples."
          onNavigate={onNavigate}
        />
      );

    case "get_sample_status": {
      if (r.found === false) return <div className="text-[11.5px] text-muted px-1">Sample not found.</div>;
      const tests = (r.tests as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = tests.map((t, i) => ({
        key: String(i),
        primary: String(t.name),
        secondary: t.spec ? `Spec: ${t.spec}` : undefined,
        trailing: t.result ? `${t.result} ${t.unit ?? ""}`.trim() : undefined,
        badge:
          t.status === "complete"
            ? { label: "Done", ...TONE.success }
            : t.status === "awaiting"
              ? { label: "Review", ...TONE.warning }
              : { label: "Pending", ...TONE.neutral },
      }));
      return (
        <div className="bg-white border border-border rounded-[14px] overflow-hidden">
          <Link href={`/samples/${r.id}`} onClick={onNavigate} className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border-soft hover:bg-chip-bg transition-colors">
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold text-text truncate">{(r.name as string) || String(r.id)}</div>
              <div className="text-[10.5px] text-muted truncate">{String(r.id)} · {String(r.type)}</div>
            </div>
            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={sampleBadge(String(r.status))}>
              {sampleBadge(String(r.status)).label}
            </span>
          </Link>
          {Boolean(r.requestorName || r.businessUnit || r.storageLocation) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 border-b border-border-soft text-[10.5px] text-muted">
              {r.requestorName ? <span><span className="text-faint">Requestor:</span> {String(r.requestorName)}</span> : null}
              {r.businessUnit ? <span><span className="text-faint">Unit:</span> {String(r.businessUnit)}</span> : null}
              {r.storageLocation ? <span><span className="text-faint">Location:</span> {String(r.storageLocation)}</span> : null}
            </div>
          )}
          <div className="flex flex-col divide-y divide-border-soft max-h-[200px] overflow-y-auto">
            {rows.length === 0 ? <div className="px-3 py-3 text-[11.5px] text-muted text-center">No tests yet.</div> : rows.map((row) => <RowLine key={row.key} row={row} onNavigate={onNavigate} />)}
          </div>
        </div>
      );
    }

    case "get_sample_status_breakdown": {
      const byStatus = (r.byStatus as Record<string, number>) ?? {};
      const entries = Object.entries(byStatus);
      const total = Math.max(1, Number(r.total ?? 0));
      return (
        <CardShell title="Sample Status Breakdown" count={r.total as number}>
          <div className="p-2.5 flex flex-col gap-1.5">
            {entries.length === 0 && <div className="text-[11.5px] text-muted text-center">No samples yet.</div>}
            {entries.map(([status, count]) => {
              const badge = sampleBadge(status);
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-text w-[132px] shrink-0 truncate">{status}</span>
                  <div className="flex-1 h-[7px] rounded-full bg-[#EEF2F5] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count / total) * 100}%`, background: badge.color }} />
                  </div>
                  <span className="text-[11px] font-bold font-mono-data text-text w-6 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </CardShell>
      );
    }

    case "get_low_stock_reagents":
    case "search_reagent_stock": {
      const reagents = (r.reagents as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = reagents.map((rg) => ({
        key: String(rg.id),
        primary: String(rg.name),
        secondary: `Lot ${rg.lotNumber} · ${rg.quantity} ${rg.unit}`,
        href: `/inventory/reagents/${rg.id}`,
        badge: rg.expired
          ? { label: "Expired", ...TONE.danger }
          : rg.lowStock
            ? { label: "Low stock", ...TONE.danger }
            : rg.expiringSoon
              ? { label: "Expiring", ...TONE.warning }
              : undefined,
      }));
      return <ListCard title={tool === "search_reagent_stock" ? "Reagent Search" : "Low Stock / Expiring"} count={rows.length} rows={rows} emptyText="Nothing to flag." onNavigate={onNavigate} />;
    }

    case "search_equipment":
    case "get_upcoming_calibrations": {
      const equipment = (r.equipment as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = equipment.map((e) => {
        const due = e.nextCalibrationDue ? new Date(String(e.nextCalibrationDue)) : null;
        const overdue = isPast(due);
        return {
          key: String(e.id),
          primary: String(e.name),
          secondary: String(e.assetTag),
          href: `/inventory/equipment/${e.id}`,
          trailing: due ? formatDate(due) : undefined,
          badge: overdue ? { label: "Overdue", ...TONE.danger } : e.status ? { label: String(e.status), ...TONE.neutral } : undefined,
        };
      });
      return <ListCard title={tool === "search_equipment" ? "Equipment Search" : "Upcoming Calibrations"} count={rows.length} rows={rows} emptyText="Nothing due." onNavigate={onNavigate} />;
    }

    case "get_deviations": {
      const deviations = (r.deviations as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = deviations.map((d) => ({
        key: String(d.id),
        primary: String(d.description),
        secondary: `${d.sampleId} · opened by ${d.openedBy}`,
        href: `/samples/${d.sampleId}`,
        badge: { label: String(d.status), ...(d.status === "Investigating" ? TONE.warning : TONE.neutral) },
      }));
      return <ListCard title="Open Deviations" count={rows.length} rows={rows} emptyText="No open deviations." onNavigate={onNavigate} />;
    }

    case "get_technician_performance": {
      const stats = (r.stats as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = stats.map((s) => ({
        key: String(s.userId),
        primary: String(s.name),
        secondary: `${s.testsSubmitted} tests submitted`,
        trailing: typeof s.onTimeRate === "number" ? `${s.onTimeRate}% on-time` : undefined,
      }));
      return <ListCard title="Technician Performance" count={rows.length} rows={rows} emptyText="No submissions in this window." onNavigate={onNavigate} />;
    }

    case "get_tat_predictions": {
      const predictions = (r.predictions as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = predictions.map((p, i) => ({
        key: String(i),
        primary: String(p.sampleType),
        secondary: `${p.currentOpenCount} open · target ${p.targetHours}h`,
        trailing: `~${p.predictedHours}h`,
      }));
      return <ListCard title="TAT Predictions" count={rows.length} rows={rows} emptyText="No sample types configured." onNavigate={onNavigate} />;
    }

    case "get_equipment_detail": {
      if (r.found === false) return <div className="text-[11.5px] text-muted px-1">Equipment not found.</div>;
      const events = (r.events as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = events.map((e, i) => ({
        key: String(i),
        primary: String(e.type),
        secondary: (e.detail as string) || undefined,
        trailing: e.performedAt ? formatDate(String(e.performedAt)) : undefined,
      }));
      return (
        <div className="bg-white border border-border rounded-[14px] overflow-hidden">
          <Link href={`/inventory/equipment/${r.id}`} onClick={onNavigate} className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border-soft hover:bg-chip-bg transition-colors">
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold text-text truncate">{String(r.name)}</div>
              <div className="text-[10.5px] text-muted truncate">{String(r.assetTag)}</div>
            </div>
            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={TONE.neutral}>
              {String(r.status)}
            </span>
          </Link>
          <div className="flex flex-col divide-y divide-border-soft max-h-[180px] overflow-y-auto">
            {rows.length === 0 ? <div className="px-3 py-3 text-[11.5px] text-muted text-center">No history yet.</div> : rows.map((row) => <RowLine key={row.key} row={row} onNavigate={onNavigate} />)}
          </div>
        </div>
      );
    }

    case "get_reagent_detail": {
      if (r.found === false) return <div className="text-[11.5px] text-muted px-1">Reagent not found.</div>;
      const transactions = (r.transactions as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = transactions.map((t, i) => ({
        key: String(i),
        primary: String(t.type),
        secondary: `by ${t.performedBy}`,
        trailing: `${Number(t.quantityChange) >= 0 ? "+" : ""}${t.quantityChange} → ${t.quantityAfter}`,
      }));
      return (
        <div className="bg-white border border-border rounded-[14px] overflow-hidden">
          <Link href={`/inventory/reagents/${r.id}`} onClick={onNavigate} className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border-soft hover:bg-chip-bg transition-colors">
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold text-text truncate">{String(r.name)}</div>
              <div className="text-[10.5px] text-muted truncate">Lot {String(r.lotNumber)} · {String(r.quantity)} {String(r.unit)}</div>
            </div>
          </Link>
          <div className="flex flex-col divide-y divide-border-soft max-h-[180px] overflow-y-auto">
            {rows.length === 0 ? <div className="px-3 py-3 text-[11.5px] text-muted text-center">No movements yet.</div> : rows.map((row) => <RowLine key={row.key} row={row} onNavigate={onNavigate} />)}
          </div>
        </div>
      );
    }

    case "list_users": {
      const users = (r.users as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = users.map((u) => ({
        key: String(u.id),
        primary: String(u.name),
        secondary: `${u.role} · ${u.section}`,
        badge: { label: String(u.accessRole), ...TONE.primary },
      }));
      return <ListCard title="Lab Staff" count={rows.length} rows={rows} emptyText="No active users." onNavigate={onNavigate} />;
    }

    case "get_my_notifications": {
      const notifications = (r.notifications as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = notifications.map((n) => ({
        key: String(n.id),
        primary: String(n.title),
        secondary: (n.body as string) || undefined,
        href: n.sampleId ? `/samples/${n.sampleId}` : undefined,
        trailing: n.createdAt ? formatDateTime(String(n.createdAt)) : undefined,
      }));
      return <ListCard title="Unread Notifications" count={rows.length} rows={rows} emptyText="You're all caught up." onNavigate={onNavigate} />;
    }

    case "get_analytics_summary":
      return <AnalyticsSummaryCard result={r} ctx={ctx} />;

    case "list_storage_locations": {
      const locations = (r.locations as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = locations.map((l) => ({
        key: String(l.id),
        primary: String(l.name),
        secondary: `${l.reagentCount} reagents · ${l.equipmentCount} equipment`,
        href: `/inventory/warehouse/${l.id}`,
        badge: l.active ? undefined : { label: "Inactive", ...TONE.neutral },
      }));
      return <ListCard title="Storage Locations" count={rows.length} rows={rows} emptyText="No locations found." onNavigate={onNavigate} />;
    }

    case "list_business_units": {
      const units = (r.units as Array<Record<string, unknown>>) ?? [];
      const rows: Row[] = units.map((u) => ({
        key: String(u.id),
        primary: String(u.name),
        secondary: `${u.sampleCount} samples`,
        badge: u.active ? undefined : { label: "Inactive", ...TONE.neutral },
      }));
      return <ListCard title="Business Units" count={rows.length} rows={rows} emptyText="No business units yet." onNavigate={onNavigate} />;
    }

    default:
      return null;
  }
}
