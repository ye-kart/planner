import { api } from './client';

export interface BillingStatus {
  configured: boolean;
}

export interface BillingSelf {
  hasStripeCustomer: boolean;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due' | null;
  plan: 'monthly' | 'yearly' | null;
  subscriptionExpiresAt: string | null;
}

export const billingApi = {
  status: () => api.get<BillingStatus>('/api/billing/status'),
  self: () => api.get<BillingSelf>('/api/billing/self'),
  checkout: (plan: 'monthly' | 'yearly') =>
    api.post<{ url: string }>('/api/billing/checkout', { plan }),
  portal: () => api.post<{ url: string }>('/api/billing/portal'),
};
