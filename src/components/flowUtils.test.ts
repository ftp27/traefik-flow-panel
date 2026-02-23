import { bucketForCode, sumFieldValues } from './flowUtils';

describe('bucketForCode', () => {
  it('returns ok for 2xx/3xx values', () => {
    expect(bucketForCode('200')).toBe('ok');
    expect(bucketForCode(204)).toBe('ok');
    expect(bucketForCode(302)).toBe('ok');
  });

  it('returns client for 4xx values', () => {
    expect(bucketForCode('404')).toBe('client');
    expect(bucketForCode(418)).toBe('client');
  });

  it('returns server for other values', () => {
    expect(bucketForCode('500')).toBe('server');
    expect(bucketForCode(503)).toBe('server');
    expect(bucketForCode(undefined)).toBe('server');
    expect(bucketForCode('not-a-code')).toBe('server');
  });
});

describe('sumFieldValues', () => {
  it('sums numeric values in an array', () => {
    expect(sumFieldValues([1, 2, 3])).toBe(6);
  });

  it('skips non-numeric values', () => {
    expect(sumFieldValues([1, 'a', 2, null])).toBe(3);
  });

  it('supports vector-like values with get()', () => {
    const vectorLike = {
      length: 3,
      get: (index: number) => (index === 1 ? 5 : 1),
    };
    expect(sumFieldValues(vectorLike)).toBe(7);
  });

  it('returns zero for missing values', () => {
    expect(sumFieldValues(undefined)).toBe(0);
  });
});
