/**
 * AuthModal route-scoping (2026-09-12 defect).
 *
 * The sign-in modal — a full-screen overlay that intercepts every click —
 * used to persist indefinitely across route navigation: a user who opened
 * it (or triggered a gated action like publishing a listing) and then
 * navigated away was followed by the modal until they found the Close
 * button, with the stale "sign in to continue: X" intent still attached.
 * Observed in the wild: it blocked the contact form's Send button three
 * routes later.
 *
 * Contract: the modal closes (and the pending intent clears) when the route
 * changes; the backdrop click dismisses like Escape / the Close button.
 */
import { render, screen, act } from '@testing-library/react';

import { AuthModal } from '@/components/shell/AuthModal';
import { AuthProvider, useAuth } from '@/lib/auth';
import { HashRouter, navigate } from '@/lib/router';

function AuthTrigger() {
  const { requireAuth } = useAuth();
  return (
    <button
      onClick={() =>
        requireAuth('Publishing a property to the Keja marketplace', () => undefined)
      }
    >
      open-auth
    </button>
  );
}

function renderApp() {
  render(
    <HashRouter>
      <AuthProvider>
        <AuthTrigger />
        <AuthModal />
      </AuthProvider>
    </HashRouter>,
  );
  return screen.getByText('open-auth');
}

describe('AuthModal route scoping', () => {
  beforeEach(async () => {
    window.location.hash = '';
    localStorage.clear();
    // jsdom delivers hashchange asynchronously — flush it before the test
    // body mounts, so a queued event from a previous test can't close a
    // freshly opened modal mid-test
    await new Promise((r) => setTimeout(r, 0));
  });

  it('opens with the pending intent and shows the sign-in dialog', async () => {
    const trigger = renderApp();
    await act(async () => {
      trigger.click();
    });
    expect(screen.getByRole('dialog', { name: 'Sign in to Keja' })).toBeTruthy();
    expect(screen.getByText(/Publishing a property to the Keja marketplace/)).toBeTruthy();
  });

  it('closes when the route changes (stale intent abandoned)', async () => {
    const trigger = renderApp();
    await act(async () => {
      trigger.click();
    });
    expect(screen.queryByRole('dialog', { name: 'Sign in to Keja' })).toBeTruthy();

    await act(async () => {
      navigate('/properties');
      // let jsdom's async hashchange land inside the act flush
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.queryByRole('dialog', { name: 'Sign in to Keja' })).toBeNull();

    // navigation with the modal closed must not break reopening
    await act(async () => {
      trigger.click();
    });
    expect(screen.queryByRole('dialog', { name: 'Sign in to Keja' })).toBeTruthy();
  });

  it('dismisses on backdrop click like Escape / the Close button', async () => {
    const trigger = renderApp();
    await act(async () => {
      trigger.click();
    });
    const dialog = screen.getByRole('dialog', { name: 'Sign in to Keja' });
    await act(async () => {
      dialog.click(); // the dialog root is the backdrop — a click on it dismisses
    });
    expect(screen.queryByRole('dialog', { name: 'Sign in to Keja' })).toBeNull();
  });
});
