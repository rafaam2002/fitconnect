import { Permission } from '../entities/Permission';
import { SubscriptionStatus } from '../entities/Subscription';

export interface LoginPermissionsContext {
  hasActiveSubscription: boolean;
  plan: {
    id: string;
    name: string;
    stripePriceId: string;
    amount: number;
    currency: string;
    interval: string;
  } | null;
  permissions: Permission[];
  permissionNames: string[];
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionId?: string;
  trialEndsAt?: Date | null;
  renewsAt?: Date | null;
  isInTrial?: boolean;
}

export interface CompanyPermissionsContext {
  companyId: string;
  companyName: string;
  plan: {
    id: string;
    name: string;
    amount: number;
    currency: string;
  };
  permissions: string[];
  subscriptionStatus: SubscriptionStatus;
  isInTrial: boolean;
  trialEndsAt?: Date | null;
  renewsAt?: Date | null;
}
