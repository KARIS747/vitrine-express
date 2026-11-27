import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { RegisterView } from '../RegisterView';
import { LanguageProvider } from '../../utils/i18n';
import { ThemeProvider } from '../../utils/theme';

describe('Frontend View: RegisterView wizard', () => {
  const renderRegister = () =>
    renderToString(
      <ThemeProvider>
        <LanguageProvider>
          <RegisterView
            onSuccess={() => {}}
            onNavigateToLogin={() => {}}
            onNavigateHome={() => {}}
            onOpenStore={() => {}}
          />
        </LanguageProvider>
      </ThemeProvider>,
    );

  it('starts on step 1 without showing the final submit button', () => {
    const html = renderRegister().replace(/<!-- -->/g, '');
    expect(html).toContain('01 / 05');
    expect(html).toContain('Donnez un nom à votre vitrine');
    expect(html).toContain('Continuer');
    expect(html).not.toContain('Créer ma vitrine et obtenir mon lien');
  });
});
