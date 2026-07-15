import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Demo Mall Parking')).toBe('demo-mall-parking');
  });
  it('strips punctuation and trims hyphens', () => {
    expect(slugify('  A/B & C!  ')).toBe('a-b-c');
  });
  it('collapses repeated separators', () => {
    expect(slugify('lot___A   B')).toBe('lot-a-b');
  });
});
