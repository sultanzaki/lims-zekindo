import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canReviewAsSupervisor, canManageInventoryAndCatalog, isAdmin } from "@/lib/roles";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";

export default async function HelpPage() {
  const user = await getCurrentUser();
  const role = user?.accessRole ?? "TECHNICIAN";
  const unread = user ? await getUnreadCount(user.id) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={role} userName={user?.name ?? ""} unreadCount={unread} />
      <BackHeader title="Help & Support" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-3 text-sm text-text">
        <Section title="Logging in a sample">
          Dashboard or Samples tab → <strong>New Sample</strong>. Pick a sample type from the
          catalog, fill in source and collection details, then <strong>Log Sample In</strong>. A
          Sample ID is assigned automatically and the required tests are attached from the
          catalog.
        </Section>

        <Section title="Entering a result">
          Open the sample, tap <strong>Enter Result</strong> on a test, fill in the value and any
          notes, then submit. Once every test on a sample has a result, it moves to Supervisor
          Review automatically.
        </Section>

        <Section title="Scanning a sample">
          Scan tab uses your camera to read the sample&apos;s QR/barcode label and jumps straight to
          its detail page. If the camera isn&apos;t available, use the manual Sample ID field instead.
        </Section>

        {canReviewAsSupervisor(role) && (
          <Section title="Reviewing results (Supervisor)">
            Samples awaiting your review show an <strong>Endorse / Reject</strong> panel on their
            detail page. Endorsing sends the sample to QA for final approval; rejecting opens a
            deviation record and requests recollection.
          </Section>
        )}

        {canReviewAsSupervisor(role) && (
          <Section title="Deviations & CAPA">
            Profile → Deviations lists every open deviation. Record a root cause and corrective /
            preventive action, then close it once resolved.
          </Section>
        )}

        {canManageInventoryAndCatalog(role) && (
          <Section title="Managing the catalog">
            Profile → Sample & Test Catalog controls which sample types and tests are available
            when logging in a new sample, along with target turnaround time and retention period.
          </Section>
        )}

        {canManageInventoryAndCatalog(role) && (
          <Section title="Inventory">
            Profile → Reagents / Equipment track stock levels, expiry dates, and calibration due
            dates for the lab.
          </Section>
        )}

        {isAdmin(role) && (
          <Section title="Managing users (Admin)">
            Profile → Users lets you create accounts, assign an access role, deactivate accounts,
            and reset a forgotten password (a temporary password is shown once — share it with
            the user and ask them to change it under Profile → Change Password).
          </Section>
        )}

        <Section title="Certificates">
          Once a sample is Complete, its detail page shows a{" "}
          <strong>View Certificate of Analysis</strong> button. From there, use{" "}
          <strong>Share / Export PDF</strong> to print or save it.
        </Section>

        <div className="text-xs text-muted text-center pt-2">
          Need something this page doesn&apos;t cover? Contact your Lab Manager.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-[18px] shadow-card-sm p-4">
      <div className="text-sm font-semibold text-text mb-1.5">{title}</div>
      <div className="text-[13px] text-muted leading-relaxed">{children}</div>
    </div>
  );
}
