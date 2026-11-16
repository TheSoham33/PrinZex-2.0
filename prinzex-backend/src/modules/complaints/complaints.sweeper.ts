import { logger } from '../../config/logger';
import { escalateExpiredComplaints } from './complaints.service';

/**
 * Auto-escalation sweeper: every SWEEP_INTERVAL_MS, complaints still in
 * pending_seller past their sellerRespondBy deadline escalate to admin
 * (escalatedBy 'system'). Started once from server.ts bootstrap; skipped in
 * tests. A failed sweep (DB blip) logs and retries on the next tick — the
 * deadline is re-evaluated from the stored timestamp, so nothing is lost.
 */
const SWEEP_INTERVAL_MS = 60_000;

let timer: NodeJS.Timeout | null = null;

export function startComplaintSweeper(): void {
  if (process.env.NODE_ENV === 'test' || timer) return;

  const sweep = async (): Promise<void> => {
    try {
      const escalated = await escalateExpiredComplaints();
      if (escalated > 0) {
        logger.info('complaint_sweep_escalated', { count: escalated });
      }
    } catch (error) {
      logger.error('complaint_sweep_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  timer = setInterval(() => void sweep(), SWEEP_INTERVAL_MS);
  timer.unref?.();
  void sweep();
}

export function stopComplaintSweeper(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
