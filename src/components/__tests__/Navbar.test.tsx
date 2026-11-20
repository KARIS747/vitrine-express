import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { Navbar } from '../Navbar';
import { LanguageProvider } from '../../utils/i18n';
import { ThemeProvider } from '../../utils/theme';

describe('Frontend Component: Navbar (SSR / HTML test)', () => {
  const renderNavbar = (view: any) =>
    renderToString(
      <ThemeProvider>
        <LanguageProvider>
          <Navbar
            currentView={view}
            onNavigate={() => {}}
            searchQuery=""
            onSearchChange={() => {}}
          />
        </LanguageProvider>
      </ThemeProvider>
    );

  it('hides "Espace gérant" and "Créer ma boutique" when visiting a store (storefront view)', () => {
    const html = renderNavbar('storefront');

    // Should NOT contain the merchant buttons
    expect(html).not.toContain('Créer ma boutique');
    expect(html).not.toContain('Espace gérant');
    expect(html).not.toContain('Merchant space');
    // Should still have home button and logo
    expect(html).toContain('VitrineExpress');
  });

  it('shows merchant buttons when on landing page', () => {
    const html = renderNavbar('landing');

    // Should contain the actions for merchants
    expect(html).toContain('Créer ma boutique');
    expect(html).toContain('VitrineExpress');
  });

  it('never displays administrative link in navbar', () => {
    const html = renderNavbar('landing');

    expect(html).not.toContain('/admin');
    expect(html).not.toContain('/karis-hq');
  });
});

