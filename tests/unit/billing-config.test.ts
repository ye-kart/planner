import { getBillingConfig } from '@planner/api';

describe('billing configuration', () => {
  it('defaults to free access', () => {
    expect(getBillingConfig({}).enabled).toBe(false);
  });

  it('only enables billing when explicitly requested', () => {
    expect(getBillingConfig({ PLANNER_BILLING_ENABLED: 'true' }).enabled).toBe(true);
    expect(getBillingConfig({ PLANNER_BILLING_ENABLED: 'TRUE' }).enabled).toBe(true);
    expect(getBillingConfig({ PLANNER_BILLING_ENABLED: 'false' }).enabled).toBe(false);
    expect(getBillingConfig({ PLANNER_BILLING_ENABLED: '1' }).enabled).toBe(false);
  });
});
