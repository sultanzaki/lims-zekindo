"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const TEAL = "#2B8DB8";
const TEAL_FILL = "rgba(43,141,184,0.12)";
const GREEN = "#28A745";
const AMBER = "#F5A623";
const RED = "#D0021B";
const GRID = "#EEF2F5";
const AXIS_TICK = { fontSize: 11, fill: "#93A6B0" };

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-[18px] shadow-card p-4 flex flex-col gap-3">
      <div>
        <div className="text-[13px] font-semibold text-text">{title}</div>
        {subtitle && <div className="text-[11px] text-muted mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function tooltipBoxStyle(): React.CSSProperties {
  return {
    background: "#fff",
    border: "1px solid #E3EAEF",
    borderRadius: 10,
    padding: "8px 11px",
    fontSize: 12,
    boxShadow: "0 4px 14px rgba(16,42,58,0.10)",
  };
}

function formatDayShort(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function SampleVolumeTrend({ data }: { data: { date: string; count: number }[] }) {
  const tickEvery = Math.max(1, Math.floor(data.length / 6));
  return (
    <ChartCard title="Sample volume" subtitle="Samples received per day, last 30 days">
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayShort}
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            interval={tickEvery - 1}
          />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={tooltipBoxStyle()}
            labelFormatter={(v) => formatDayShort(String(v))}
            formatter={(value) => [`${value} sample${value === 1 ? "" : "s"}`, "Received"]}
          />
          <Area type="monotone" dataKey="count" stroke={TEAL} strokeWidth={2} fill={TEAL_FILL} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function VolumeByCategoryBar({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: { label: string; count: number }[];
}) {
  const height = Math.max(120, data.length * 34);
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ ...AXIS_TICK, fill: "#5B6B74" }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip contentStyle={tooltipBoxStyle()} formatter={(value) => [`${value}`, "Samples"]} />
          <Bar dataKey="count" fill={TEAL} radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PassRejectTrend({ data }: { data: { week: string; approved: number; rejected: number }[] }) {
  return (
    <ChartCard title="Pass / reject trend" subtitle="Weekly, last 12 weeks">
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="week" tickFormatter={formatDayShort} tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} interval={1} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={28} />
          <Tooltip contentStyle={tooltipBoxStyle()} labelFormatter={(v) => `Week of ${formatDayShort(String(v))}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          <Line type="monotone" dataKey="approved" name="Approved" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="rejected" name="Rejected" stroke={RED} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function DeviationTrend({ data }: { data: { week: string; count: number }[] }) {
  return (
    <ChartCard title="Deviations opened" subtitle="Weekly, last 12 weeks">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="week" tickFormatter={formatDayShort} tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} interval={1} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={tooltipBoxStyle()}
            labelFormatter={(v) => `Week of ${formatDayShort(String(v))}`}
            formatter={(value) => [`${value}`, "Deviations"]}
          />
          <Line type="monotone" dataKey="count" stroke={RED} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TatComplianceByType({ data }: { data: { type: string; onTime: number; late: number }[] }) {
  const height = Math.max(120, data.length * 34);
  return (
    <ChartCard title="TAT compliance by sample type" subtitle="Completed samples, on-time vs late">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="type" tick={{ ...AXIS_TICK, fill: "#5B6B74" }} axisLine={false} tickLine={false} width={110} />
          <Tooltip contentStyle={tooltipBoxStyle()} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          <Bar dataKey="onTime" name="On-time" stackId="tat" fill={GREEN} radius={[4, 0, 0, 4]} maxBarSize={18} />
          <Bar dataKey="late" name="Late" stackId="tat" fill={RED} radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function StatusMeter({
  title,
  segments,
}: {
  title: string;
  segments: { label: string; count: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  return (
    <ChartCard title={title}>
      {total === 0 ? (
        <div className="text-xs text-muted py-4 text-center">No data yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex h-3 rounded-full overflow-hidden bg-[#EEF2F5]">
            {segments.map((s) =>
              s.count > 0 ? (
                <div
                  key={s.label}
                  style={{ width: `${(s.count / total) * 100}%`, background: s.color }}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                />
              ) : null
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {segments.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-muted flex-1 truncate">{s.label}</span>
                <span className="font-semibold text-text font-mono-data">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export function EquipmentHealthMeter({ operational, underMaintenance, outOfService }: { operational: number; underMaintenance: number; outOfService: number }) {
  return (
    <StatusMeter
      title="Equipment health"
      segments={[
        { label: "Operational", count: operational, color: GREEN },
        { label: "Under Maintenance", count: underMaintenance, color: AMBER },
        { label: "Out of Service", count: outOfService, color: RED },
      ]}
    />
  );
}

export function ReagentHealthMeter({ ok, expiringSoon, lowStock, expired }: { ok: number; expiringSoon: number; lowStock: number; expired: number }) {
  return (
    <StatusMeter
      title="Reagent & chemical stock health"
      segments={[
        { label: "OK", count: ok, color: GREEN },
        { label: "Expiring soon", count: expiringSoon, color: AMBER },
        { label: "Low stock", count: lowStock, color: "#F26B2B" },
        { label: "Expired", count: expired, color: RED },
      ]}
    />
  );
}

export function StatusDistributionBar({ data }: { data: { status: string; count: number }[] }) {
  return <VolumeByCategoryBar title="Current sample status" data={data.map((d) => ({ label: d.status, count: d.count }))} />;
}
