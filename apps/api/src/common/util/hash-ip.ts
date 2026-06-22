import { createHash } from 'node:crypto';

/**
 * Hash a client IP so analytics can count distinct visitors without ever storing
 * a raw IP address. The JWT secret doubles as a per-deployment salt.
 */
export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}
