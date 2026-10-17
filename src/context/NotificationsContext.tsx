import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AppState } from "react-native";
import { getUnreadNotificationCount, markAllNotificationsAsRead } from "../services/api/notifications";
import { useAuth } from "./AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

type LocalNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  orderId?: string;
  imageUrl?: string;
  timestamp?: number;
};

type NotificationsContextType = {
  unreadCount: number;
  localNotifications: LocalNotification[];
  fetchNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearLocalNotifications: () => void;
};

export const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const LOCAL_NOTIFS_KEY = "@local_notifications";
const MAX_NOTIFS = 50;

export const NotificationsProvider = ({ children }: any) => {
  const { jwtToken } = useAuth();
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const [localNotifications, setLocalNotificationsState] = useState<LocalNotification[]>([]);
  const appState = useRef(AppState.currentState);

  // Safely write to state and AsyncStorage
  const setLocalNotifications = useCallback((updater: (prev: LocalNotification[]) => LocalNotification[]) => {
    setLocalNotificationsState((prev) => {
      const nextRaw = updater(prev);
      const nextFiltered = nextRaw
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, MAX_NOTIFS);
      
      AsyncStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(nextFiltered)).catch((e) =>
        console.warn("AsyncStorage error saving notifications:", e)
      );
      return nextFiltered;
    });
  }, []);

  // Load from AsyncStorage explicitly on mount
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(LOCAL_NOTIFS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
             setLocalNotificationsState(parsed);
          }
        }
      } catch (e) {
        console.warn("AsyncStorage error loading local notifications:", e);
      }
    };
    loadCache();
  }, []);

  // ─── Fetch server notifications for badge count ───
  const fetchNotifications = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setServerUnreadCount(count || 0);
    } catch (e: any) {
      // silent fallback
    }
  }, []);

  // ─── Refresh on app foreground ───
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        fetchNotifications();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [fetchNotifications]);

  // ─── Initial fetch + polling ───
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
    } catch {
      // silent fallback
    }
    setServerUnreadCount(0);
    setLocalNotifications((prev) =>
      prev.map((n) => ({ ...n, unread: false }))
    );
  }, [setLocalNotifications]);

  const clearLocalNotifications = () => {
    setLocalNotifications(() => []);
  };

  // Total unread = server unread + local push unread
  const localUnread = localNotifications.filter((n) => n.unread).length;
  const unreadCount = serverUnreadCount + localUnread;

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        localNotifications,
        fetchNotifications,
        markAllAsRead,
        clearLocalNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationsProvider");
  return context;
};
