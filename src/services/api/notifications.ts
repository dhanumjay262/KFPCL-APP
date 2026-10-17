import http from "./httpClient";

export interface NotificationItem {
  id: number | string;
  type?: "RFQ_RESPONSE_RECEIVED" | "RFQ_ACCEPTED" | "RFQ_REJECTED" | "GENERAL" | string;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
  createdAt?: string;
  isRead?: boolean;
}

export const getUnreadNotificationCount = async (_token?: string): Promise<number> => {
  try {
    const res = await http.get<any>("/api/notifications/unread-count");
    const count = res?.data?.unreadCount ?? res?.data?.count ?? res?.count;
    if (typeof count === "number") {
      return count;
    }
    const list = await getNotifications();
    return list.filter((n) => !n.isRead).length;
  } catch {
    try {
      const list = await getNotifications();
      return list.filter((n) => !n.isRead).length;
    } catch {
      return 0;
    }
  }
};

export const getNotifications = async (): Promise<NotificationItem[]> => {
  try {
    const res = await http.get<any>("/api/notifications");
    const list = Array.isArray(res)
      ? res
      : res?.data?.content || res?.data || res?.content || [];

    if (Array.isArray(list)) {
      return list.map((item: any) => ({
        id: item.id || Math.random().toString(),
        type: item.type || "GENERAL",
        title: item.title || "Wholesale Update",
        message: item.message || "",
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        createdAt: item.createdAt,
        isRead: Boolean(item.isRead),
      }));
    }
    return [];
  } catch (err) {
    console.warn("[notifications] Error fetching /api/notifications:", err);
    return [];
  }
};

export const markNotificationAsRead = async (id: number | string): Promise<boolean> => {
  try {
    await http.patch<any>(`/api/notifications/${id}/read`, {});
    return true;
  } catch {
    return false;
  }
};

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    await http.patch<any>("/api/notifications/read-all", {});
    return true;
  } catch {
    return false;
  }
};
