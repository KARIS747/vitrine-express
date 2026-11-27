import type { PlanId } from './plans';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface RegistrationValues {
  storeName: string;
  whatsappNumber: string;
  country: string;
  customCountry: string;
  city: string;
  customCity: string;
  contactPreference: 'whatsapp' | 'email';
  contactEmail: string;
  pinCode: string;
  pinConfirm: string;
  selectedPlan: PlanId;
  promoCode: string;
}

export const WIZARD_STEPS: WizardStep[] = [1, 2, 3, 4, 5];

export function normalizePhone(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export function isNameValid(values: RegistrationValues): boolean {
  return values.storeName.trim().length >= 2;
}

export function isPhoneValid(values: RegistrationValues): boolean {
  const phone = normalizePhone(values.whatsappNumber);
  return phone.length >= 8 && phone.length <= 15;
}

export function isEmailValid(values: RegistrationValues): boolean {
  if (values.contactPreference === 'whatsapp') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim());
}

export function isPinValid(values: RegistrationValues): boolean {
  return values.pinCode.length >= 4 && values.pinCode.length <= 12;
}

export function isPinMatch(values: RegistrationValues): boolean {
  return isPinValid(values) && values.pinCode === values.pinConfirm;
}

export function isLocationValid(values: RegistrationValues): boolean {
  if (values.country === 'Autre' && !values.customCountry.trim()) return false;
  return true;
}

export function isStepValid(step: WizardStep, values: RegistrationValues): boolean {
  switch (step) {
    case 1:
      return isNameValid(values);
    case 2:
      return isPhoneValid(values) && isEmailValid(values);
    case 3:
      return isLocationValid(values);
    case 4:
      return isPinMatch(values);
    case 5:
      return (
        isNameValid(values) &&
        isPhoneValid(values) &&
        isEmailValid(values) &&
        isLocationValid(values) &&
        isPinMatch(values)
      );
  }
}

export function nextStep(step: WizardStep): WizardStep {
  return Math.min(5, step + 1) as WizardStep;
}

export function previousStep(step: WizardStep): WizardStep {
  return Math.max(1, step - 1) as WizardStep;
}
