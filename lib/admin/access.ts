import { isAdminEmail } from './config';

export type AccessProfile = {
  email?: string | null;
  subscription_status?: string | null;
};

/** Admin / fundador: acceso ilimitado, premium y gratuito. */
export function hasUnlimitedAccess(profile: AccessProfile | null | undefined): boolean {
  if (!profile) return false;
  return isAdminEmail(profile.email) || profile.subscription_status === 'admin';
}

export function hasPremiumAccess(profile: AccessProfile | null | undefined): boolean {
  if (!profile) return false;
  return (
    hasUnlimitedAccess(profile) ||
    profile.subscription_status === 'premium'
  );
}

/** Sin límites de uso (chat, OCR, escenarios, etc.). */
export function canUseFeature(_feature: string, profile: AccessProfile | null | undefined): boolean {
  if (hasUnlimitedAccess(profile)) return true;
  return hasPremiumAccess(profile);
}

export function getAccessLabel(profile: AccessProfile | null | undefined): string {
  if (hasUnlimitedAccess(profile)) return 'Fundador · Acceso ilimitado';
  if (profile?.subscription_status === 'premium') return 'Premium';
  return 'Gratis';
}
