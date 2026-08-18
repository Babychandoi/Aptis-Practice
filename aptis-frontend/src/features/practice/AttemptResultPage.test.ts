import { describe, expect, it } from 'vitest';
import { formatScoreLine } from './scoreDisplay';

describe('formatScoreLine', () => {
  it('keeps the AI scoring state renderable when the API omits a pending score', () => {
    expect(formatScoreLine(undefined, 20)).toBeNull();
    expect(formatScoreLine(null, 20)).toBeNull();
  });

  it('formats a completed score', () => {
    expect(formatScoreLine(12.5, 20)).toBe('12.5/20.0');
  });
});
