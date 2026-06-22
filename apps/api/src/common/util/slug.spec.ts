import { DEFAULT_SLUG_LENGTH, generateSlug } from './slug';

describe('generateSlug', () => {
  it('returns a slug of the default length', () => {
    expect(generateSlug()).toHaveLength(DEFAULT_SLUG_LENGTH);
  });

  it('honors a custom length and uses only URL-safe characters', () => {
    expect(generateSlug(20)).toMatch(/^[0-9a-zA-Z]{20}$/);
  });

  it('is collision-free across many calls', () => {
    const slugs = new Set(Array.from({ length: 2000 }, () => generateSlug()));
    expect(slugs.size).toBe(2000);
  });
});
