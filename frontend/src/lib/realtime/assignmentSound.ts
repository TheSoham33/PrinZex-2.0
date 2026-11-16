/**
 * Best-effort "new assignment" chime via the Web Audio API — no audio asset to
 * ship, no network fetch, and it degrades to silence (the toast still fires)
 * when the browser's autoplay policy blocks audio without a user gesture.
 */

let audioCtx: AudioContext | null = null;

/** Two ascending sine notes — a short, friendly "new job" ping. */
const CHIME_NOTES = [
  { frequency: 880, startAt: 0, duration: 0.18 }, // A5
  { frequency: 1318.51, startAt: 0.18, duration: 0.3 }, // E6
] as const;

export function playAssignmentChime(): void {
  try {
    if (typeof window === 'undefined') return;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    if (!audioCtx) {
      audioCtx = new Ctor();
    }
    // resume() resolves an AudioContext that started suspended (autoplay).
    void audioCtx.resume().catch(() => {});

    const ctx = audioCtx;
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    gain.connect(ctx.destination);

    for (const note of CHIME_NOTES) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note.frequency;
      osc.connect(gain);
      osc.start(now + note.startAt);
      osc.stop(now + note.startAt + note.duration);
    }
  } catch {
    // AudioContext unavailable/blocked — the assignment toast is the cue.
  }
}
