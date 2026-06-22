import { durationToMs } from './duration';

describe('durationToMs', () => {
  it.each<[string, number]>([
    ['7d', 604_800_000],
    ['12h', 43_200_000],
    ['30m', 1_800_000],
    ['45s', 45_000],
    ['500ms', 500],
    ['10', 10],
  ])('parses %s', (input, expected) => {
    expect(durationToMs(input)).toBe(expected);
  });

  it('returns 0 for unparseable input', () => {
    expect(durationToMs('nonsense')).toBe(0);
  });
});
