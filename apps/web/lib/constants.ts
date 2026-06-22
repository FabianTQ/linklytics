export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Must match the API's COOKIE_NAME. Used by middleware to gate routes. */
export const SESSION_COOKIE_NAME = 'linklytics_session';
