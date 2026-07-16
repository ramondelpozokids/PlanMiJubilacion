import { describe, expect, it } from 'vitest';
import { evaluateInternationalCoordination } from '@/lib/international-coordination/evaluate';
import { buildCombinedPensionSummary } from '@/lib/international-coordination/combined';
import type { InternationalCotizacionesData } from '@/lib/international-coordination/types';

describe('evaluateInternationalCoordination', () => {
  it('returns null when no foreign work', () => {
    expect(
      evaluateInternationalCoordination({
        hasWorkedAbroad: false,
        periods: [],
        updatedAt: new Date().toISOString(),
      })
    ).toBeNull();
  });

  it('detects EU coordination for Germany', () => {
    const data: InternationalCotizacionesData = {
      hasWorkedAbroad: true,
      periods: [
        {
          id: '1',
          countryCode: 'DE',
          countryName: 'Alemania',
          yearsContributed: 5,
          approximateStart: '2010-01',
          approximateEnd: '2015-06',
          stillContributing: false,
          pensionAlreadyRequested: false,
          documentedMonthlyPensionEur: null,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    const r = evaluateInternationalCoordination(data);
    expect(r?.evaluations[0].coordinationType).toBe('eu_eea_ch');
    expect(r?.totalizationPossibleAny).toBe(true);
    expect(r?.spanishEstimateMayBeIncomplete).toBe(true);
    expect(r?.evaluations[0].foreignPensionDocumented).toBe(false);
  });

  it('sums documented German pension with Spanish estimate', () => {
    const data: InternationalCotizacionesData = {
      hasWorkedAbroad: true,
      periods: [
        {
          id: '1',
          countryCode: 'DE',
          countryName: 'Alemania',
          yearsContributed: 8,
          approximateStart: '2005-01',
          approximateEnd: '2013-12',
          stillContributing: false,
          pensionAlreadyRequested: true,
          documentedMonthlyPensionEur: 380.5,
          documentedPensionSource: 'Carta Deutsche Rentenversicherung',
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    const r = evaluateInternationalCoordination(data);
    expect(r?.evaluations[0].documentedMonthlyEur).toBe(380.5);
    const combined = buildCombinedPensionSummary({
      spainMonthly: 2200,
      coordination: r,
    });
    expect(combined?.foreignDocumentedTotal).toBe(380.5);
    expect(combined?.combinedMonthly).toBe(2580.5);
  });

  it('detects bilateral for Argentina', () => {
    const data: InternationalCotizacionesData = {
      hasWorkedAbroad: true,
      periods: [
        {
          id: '1',
          countryCode: 'AR',
          countryName: 'Argentina',
          yearsContributed: 8,
          approximateStart: '2000-01',
          approximateEnd: '2008-12',
          stillContributing: false,
          pensionAlreadyRequested: false,
          documentedMonthlyPensionEur: null,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    const r = evaluateInternationalCoordination(data);
    expect(r?.evaluations[0].coordinationType).toBe('bilateral');
    expect(r?.totalizationPossibleAny).toBe(true);
  });

  it('flags no coordination for unknown country', () => {
    const data: InternationalCotizacionesData = {
      hasWorkedAbroad: true,
      periods: [
        {
          id: '1',
          countryCode: 'OTHER',
          countryName: 'País sin convenio',
          yearsContributed: 3,
          approximateStart: null,
          approximateEnd: null,
          stillContributing: false,
          pensionAlreadyRequested: false,
          documentedMonthlyPensionEur: null,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    const r = evaluateInternationalCoordination(data);
    expect(r?.evaluations[0].totalizationPossible).toBe(false);
  });
});
