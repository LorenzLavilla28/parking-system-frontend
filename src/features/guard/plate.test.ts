import { describe, expect, it } from 'vitest';
import { normalizePlateForSubmit, normalizePlateInput } from './plate';

describe('plate normalization', () => {
  it('uppercases and collapses spaces and hyphens for display', () => {
    expect(normalizePlateInput(' abc--1234  ')).toBe('ABC 1234 ');
  });

  it('trims the submit value', () => {
    expect(normalizePlateForSubmit(' abc--1234  ')).toBe('ABC 1234');
  });
});
