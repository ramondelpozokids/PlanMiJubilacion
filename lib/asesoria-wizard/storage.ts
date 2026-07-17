import {
  emptyWizardDraft,
  WIZARD_STORAGE_KEY,
  type WizardDraftState,
} from './types';

export function loadWizardDraft(): WizardDraftState {
  if (typeof window === 'undefined') return emptyWizardDraft();
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return emptyWizardDraft();
    const parsed = JSON.parse(raw) as WizardDraftState;
    if (parsed?.version !== 1) return emptyWizardDraft();
    return { ...emptyWizardDraft(), ...parsed };
  } catch {
    return emptyWizardDraft();
  }
}

export function saveWizardDraft(draft: WizardDraftState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      WIZARD_STORAGE_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearWizardDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
