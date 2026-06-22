import { customAlphabet } from 'nanoid';

// URL-safe, unambiguous-ish alphabet (no characters that need escaping).
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const DEFAULT_SLUG_LENGTH = 7;

const generator = customAlphabet(ALPHABET, DEFAULT_SLUG_LENGTH);

/** Generate a random URL-safe slug. Collision handling is done by the caller. */
export function generateSlug(length: number = DEFAULT_SLUG_LENGTH): string {
  return generator(length);
}
