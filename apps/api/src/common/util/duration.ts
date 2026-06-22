const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/**
 * Parse a short duration string like `7d`, `12h`, `30m`, `500ms` into
 * milliseconds. Used to align the auth cookie `maxAge` with `JWT_EXPIRES_IN`.
 * Falls back to 0 for unrecognized input.
 */
export function durationToMs(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d|w)?$/.exec(input.trim());
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2] ?? 'ms';
  return amount * UNIT_MS[unit];
}
