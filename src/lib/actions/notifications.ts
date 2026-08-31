"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function markAllReadAction() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, unread: true },
    data: { unread: false },
  });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  sampleId: string | null;
  unread: boolean;
  createdAt: Date;
};

export async function getNotificationsAction(): Promise<NotificationRow[]> {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    sampleId: n.sampleId,
    unread: n.unread,
    createdAt: n.createdAt,
  }));
}
