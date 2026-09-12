'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hooks';
import { useToast } from '@/components/seller-dashboard/Toast';
import {
  connectDeliverySocket,
  DELIVERY_ASSIGNED_EVENT,
  type DeliveryAssignedEvent,
} from '@/lib/realtime/deliverySocket';
import { playAssignmentChime } from '@/lib/realtime/assignmentSound';

/**
 * Rider real-time cue (gap #6): while the rider is signed in, keep a Socket.io
 * connection on the `/orders` namespace and react the moment the backend pushes
 * `delivery.assigned` — play a chime, flash a toast, and invalidate the
 * active-delivery query so the card repaints immediately.
 *
 * Polling (30s refetch in the dashboard) is intentionally left in place as the
 * fallback for socket outages / flaky networks — this component is additive.
 * It renders nothing.
 */
export default function DeliveryAssignmentListener() {
  const accessToken = useAppSelector((state) => state.deliveryAuth.accessToken);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    if (!accessToken) return undefined;

    const socket = connectDeliverySocket(accessToken);

    // Socket problems are silent — the 30s poll covers the gap, and the rider
    // should never see a "realtime unavailable" banner for infra noise.
    socket.on('connect_error', () => {
      /* fall back to polling */
    });

    socket.on(DELIVERY_ASSIGNED_EVENT, (payload: DeliveryAssignedEvent) => {
      playAssignmentChime();
      const pickup =
        typeof payload?.pickupAddress === 'string' && payload.pickupAddress.trim().length > 0
          ? ` — pickup from ${payload.pickupAddress}`
          : '';
      showToast(`New delivery assigned${pickup}`);
      void queryClient.invalidateQueries({ queryKey: ['delivery-active'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, queryClient, showToast]);

  return null;
}
