export default function PageHeader({
  title,
  action,
  sticky = true,
}: {
  title: string;
  action?: React.ReactNode;
  sticky?: boolean;
}) {
  return (
    <div
      className={`${sticky ? "sticky top-0 z-10" : ""} bg-white border-b border-border px-5 pt-6 pb-4 flex items-center justify-between`}
    >
      <h1 className="text-[19px] font-bold text-text tracking-tight">{title}</h1>
      {action}
    </div>
  );
}
