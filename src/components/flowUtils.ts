import { StatusBuckets } from '../types';

export const emptyBuckets = (): StatusBuckets => ({ ok: 0, client: 0, server: 0 });

export const bucketForCode = (codeValue: string | number | undefined): keyof StatusBuckets => {
  const code = typeof codeValue === 'number' ? codeValue : Number.parseInt(codeValue ?? '', 10);
  if (Number.isFinite(code) && code >= 200 && code <= 399) {
    return 'ok';
  }
  if (Number.isFinite(code) && code >= 400 && code <= 499) {
    return 'client';
  }
  return 'server';
};

export const sumFieldValues = (values: unknown): number => {
  if (!values || typeof (values as { length?: number }).length !== 'number') {
    return 0;
  }
  const valueList = values as { length: number; get?: (index: number) => unknown } & Record<number, unknown>;
  let total = 0;
  for (let i = 0; i < valueList.length; i += 1) {
    const v = valueList.get ? valueList.get(i) : valueList[i];
    if (typeof v === 'number' && Number.isFinite(v)) {
      total += v;
    }
  }
  return total;
};
