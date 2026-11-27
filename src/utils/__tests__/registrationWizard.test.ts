import { describe, it, expect } from 'vitest';
import {
  isStepValid,
  isLocationValid,
  nextStep,
  normalizePhone,
  previousStep,
  type RegistrationValues,
} from '../registrationWizard';

const baseValues: RegistrationValues = {
  storeName: 'Glamour Beauté',
  whatsappNumber: '+237 699 112 233',
  country: 'Cameroun',
  customCountry: '',
  city: 'Douala',
  customCity: '',
  contactPreference: 'whatsapp',
  contactEmail: '',
  pinCode: '1234',
  pinConfirm: '1234',
  selectedPlan: 'decouverte',
  promoCode: '',
};

describe('registrationWizard', () => {
  it('normalizes phone numbers', () => {
    expect(normalizePhone('+237 699 112 233')).toBe('237699112233');
  });

  it('validates each step independently', () => {
    expect(isStepValid(1, { ...baseValues, storeName: 'A' })).toBe(false);
    expect(isStepValid(1, baseValues)).toBe(true);
    expect(isStepValid(2, { ...baseValues, whatsappNumber: '123' })).toBe(false);
    expect(isStepValid(2, baseValues)).toBe(true);
    expect(isStepValid(4, { ...baseValues, pinCode: '1234', pinConfirm: '4321' })).toBe(false);
    expect(isStepValid(4, baseValues)).toBe(true);
  });

  it('requires an email when email contact is selected', () => {
    expect(isStepValid(2, { ...baseValues, contactPreference: 'email' })).toBe(false);
    expect(
      isStepValid(2, {
        ...baseValues,
        contactPreference: 'email',
        contactEmail: 'boutique@example.com',
      }),
    ).toBe(true);
  });

  it('requires a custom country when Autre is selected', () => {
    const values = { ...baseValues, country: 'Autre', customCountry: '' };
    expect(isLocationValid(values)).toBe(false);
    expect(isStepValid(3, values)).toBe(false);
    expect(isStepValid(3, { ...values, customCountry: 'Guinée' })).toBe(true);
  });

  it('enforces PIN length between 4 and 12', () => {
    expect(isStepValid(4, { ...baseValues, pinCode: '123', pinConfirm: '123' })).toBe(false);
    expect(
      isStepValid(4, { ...baseValues, pinCode: '1234567890123', pinConfirm: '1234567890123' }),
    ).toBe(false);
  });

  it('moves between steps without leaving the wizard range', () => {
    expect(nextStep(1)).toBe(2);
    expect(nextStep(5)).toBe(5);
    expect(previousStep(3)).toBe(2);
    expect(previousStep(1)).toBe(1);
  });
});
