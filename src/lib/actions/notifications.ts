"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { listNotifications, markAllNotificationsRead, type NotificationRow } from "@/lib/data";

export async function markAllReadAction() {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export type { NotificationRow };

export async function getNotificationsAction(): Promise<NotificationRow[]> {
  const user = await requireUser();
  return listNotifications(user.id);
}
