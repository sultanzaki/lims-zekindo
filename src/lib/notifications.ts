export function notifAccent(title: string) {
  const t = title.toLowerCase();
  if (t.includes("rejected") || t.includes("overdue") || t.includes("deviation")) {
    return { bg: "#FDECEA", color: "#D0021B" };
  }
  if (t.includes("approved") || t.includes("complete")) {
    return { bg: "#E6F4EA", color: "#28A745" };
  }
  return { bg: "#E8F4FA", color: "#2B8DB8" };
}
