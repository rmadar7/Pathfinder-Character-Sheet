// The in-app Diagnostics panel, run as a test suite (ARCHITECTURE T1).
import { describe, expect, it } from 'vitest';
import { runSelfTests } from '../src/rules/selftest';
import { kaldaran } from './helpers';

describe('diagnostics: rules checks', () => {
  const { checks, issues } = runSelfTests(kaldaran());
  it('has at least the 27 checks v36 had', () => expect(checks.length).toBeGreaterThanOrEqual(27));
  for (const c of checks) it(c.name, () => expect(c.got, c.why).toEqual(c.want));
  it('Kaldaran has nothing outstanding (v36 showed the same)', () =>
    expect(issues.filter((i) => !i.ok).map((i) => `${i.name}: ${i.detail}`)).toEqual([]));
});
