'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hooks';
import { useToast } from '@/components/seller-dashboard/Toast';
import {
  connectNotificationSocket,
  NOTIFICATION_NEW_EVENT,
  type NotificationNewEvent,
} from '@/lib/realtime/notificationSocket';

/**
 * Real-time inbox cue: while a customer is signed in, keep a Socket.io
 * connection on `/orders` and react the moment the backend pushes
 * `notification.new` to their room — toast the title and invalidate the
 * notifications queries so every open surface repaints immediately.
 * Socket outages stay silent; the page refetches on focus/mount as fallback.
 * Renders nothing.
 */
export default function NotificationListener() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    if (!accessToken) return undefined;

    const socket = connectNotificationSocket(accessToken);

    socket.on('connect_error', () => {
      /* silent — refetch-on-mount covers gaps */
    });

    socket.on(NOTIFICATION_NEW_EVENT, (payload: NotificationNewEvent) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast(payload.title);
    });

    return () => {
      socket.off(NOTIFICATION_NEW_EVENT);
      socket.disconnect();
    };
  }, [accessToken, queryClient, showToast]);

  return null;
}
