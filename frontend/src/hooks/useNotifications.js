import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../api/notificationService.js';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const items = await notificationService.fetchNotifications();
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.is_read).length);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userId]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!userId) {
        if (isMounted) {
          setNotifications([]);
          setUnreadCount(0);
        }
        return;
      }

      try {
        const items = await notificationService.fetchNotifications();
        if (!isMounted) return;
        setNotifications(items);
        setUnreadCount(items.filter(n => !n.is_read).length);
      } catch {
        if (!isMounted) return;
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const markRead = useCallback(async (id) => {
    await notificationService.markRead(id);
    await load();
  }, [load]);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    await load();
  }, [load]);

  return { notifications, unreadCount, markRead, markAllRead, reload: load };
}
