import { describe, it, expect } from 'vitest';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\' + '$' + '&');
}

function calculateRelevance(query: string, description: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerDesc = description.toLowerCase();
  if (lowerDesc === lowerQuery) return 100;
  if (lowerDesc.startsWith(lowerQuery)) return 90;
  const wordBoundaryRegex = new RegExp('\\b' + escapeRegex(lowerQuery) + '\\b', 'i');
  if (wordBoundaryRegex.test(lowerDesc)) return 80;
  if (lowerDesc.includes(lowerQuery)) return 70;
  return 0;
}

function calculateDutiesFromRates(cif: number, bm: number, ppn: number, ppnbm: number, pph: number) {
  const bmAmt = cif * (bm / 100);
  const ppnBase = cif + bmAmt;
  const ppnAmt = ppnBase * (ppn / 100);
  const ppnbmAmt = ppnBase * (ppnbm / 100);
  const pphBase = cif + bmAmt + ppnAmt + ppnbmAmt;
  const pphAmt = pphBase * (pph / 100);
  return { bmAmount: bmAmt, ppnBase, ppnAmount: ppnAmt, ppnbmAmount: ppnbmAmt, pphBase, pphAmount: pphAmt, totalDuties: bmAmt + ppnAmt + ppnbmAmt + pphAmt };
}

type FTACode = 'ATIGA' | 'ACFTA' | 'AKFTA' | 'AJCEP' | 'AANZFTA' | 'IJEPA';
function isValidFTACode(code: string): code is FTACode {
  return ['ATIGA', 'ACFTA', 'AKFTA', 'AJCEP', 'AANZFTA', 'IJEPA'].includes(code);
}

describe('HS Code Utils', () => {
  describe('calculateRelevance', () => {
    it('returns 100 for exact match', () => {
      expect(calculateRelevance('cargo', 'cargo')).toBe(100);
    });
    it('returns 90 for prefix match', () => {
      expect(calculateRelevance('cargo', 'cargo transport')).toBe(90);
    });
    it('returns 0 for no match', () => {
      expect(calculateRelevance('apple', '12345')).toBe(0);
    });
  });

  describe('calculateDutiesFromRates', () => {
    it('calculates BM correctly', () => {
      const r = calculateDutiesFromRates(1000000, 10, 11, 0, 2.5);
      expect(r.bmAmount).toBe(100000);
    });
    it('calculates total correctly', () => {
      const r = calculateDutiesFromRates(1000000, 10, 11, 0, 2.5);
      expect(r.totalDuties).toBe(251525);
    });
  });

  describe('isValidFTACode', () => {
    it('accepts valid codes', () => {
      expect(isValidFTACode('ATIGA')).toBe(true);
    });
    it('rejects invalid codes', () => {
      expect(isValidFTACode('INVALID')).toBe(false);
    });
  });
});
