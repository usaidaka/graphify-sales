import { describe, expect, it } from 'vitest';
import { extractKppLabel } from './index';

describe('extractKppLabel', () => {
  it('reads the KPP code from formatted and compact legacy NPWP values', () => {
    expect(extractKppLabel('62.141.374.9-412.000')).toBe('KPP 412');
    expect(extractKppLabel('621413749412000')).toBe('KPP 412');
  });

  it('does not invent a KPP code for the 16 digit NPWP format', () => {
    expect(extractKppLabel('0951682582061000')).toBe('');
  });
});
