import { FlaskConical, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Demo boundary banner — makes the prototype status impossible to miss.
 *
 * Review feedback: "the UI must make the boundary impossible to miss at every
 * sensitive entry point". This banner is dismissible for one session, but
 * re-asserts itself on sensitive routes (tokenize, admin, account, dashboard)
 * even after being dismissed. While visible it shifts the fixed navbar and
 * main content down via the `demo-banner` class on <html> (see index.css).
 */

const DISMISSED_KEY = 'keja.demoBanner.dismissed';

/** Routes where the demo boundary must re-assert itself. */
const SENSITIVE_ROUTES = ['/tokenize', '/admin', '/account', '/dashboard'];

export default function DemoBanner() {
  // synchronous first render (no hydration flicker): returning users within
  // the session never see the banner re-appear before React hides it
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const location = useLocation();

  const sensitive = SENSITIVE_ROUTES.some((r) => location.pathname.startsWith(r));
  const visible = !dismissed || sensitive;

  useEffect(() => {
    document.documentElement.classList.toggle('demo-banner', visible);
    return () => document.documentElement.classList.remove('demo-banner');
  }, [visible]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* private mode — banner just returns next navigation */
    }
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <div
      role="note"
      aria-label="Demo environment notice"
      className="fixed inset-x-0 top-0 z-[70] h-9 overflow-hidden border-b border-amber-300 bg-amber-50 text-amber-900"
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-center gap-2 px-8 text-center">
        <FlaskConical className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
        <span className="truncate text-[10px] font-medium leading-none sm:text-xs">
          <strong className="font-bold">Demo environment</strong> — all data, accounts and balances
          are simulated.{' '}
          <Link
            to="/trust#claims"
            className="whitespace-nowrap font-semibold underline decoration-amber-400 underline-offset-2 hover:text-amber-700"
          >
            What&rsquo;s real vs simulated
          </Link>
        </span>
        <button
          onClick={dismiss}
          className="absolute right-2 rounded p-1 text-amber-600 transition hover:bg-amber-100"
          aria-label="Dismiss demo notice"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
