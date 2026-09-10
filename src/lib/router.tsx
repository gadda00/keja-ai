'use client';
/**
 * Hash-based SPA router.
 *
 * The whole Keja platform lives on a single Next.js route (`/`), with
 * hash-path deep links (`#/properties/KJA-001`). This works identically:
 *   - behind the sandbox preview gateway (only `/` is exposed),
 *   - on Vercel / keja.app (vercel.json rewrites keep legacy path URLs graceful),
 *   - inside the Capacitor Android/iOS shells (local file context).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface Route {
  /** path after the hash, always starts with '/' — e.g. /properties/KJA-001 */
  path: string;
  /** segments — ['properties', 'KJA-001'] */
  segments: string[];
  /** query params parsed from the hash — e.g. #/properties?q=kilimani */
  query: Record<string, string>;
}

function parseHash(): Route {
  const raw = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '');
  const [pathPart, queryPart] = raw.split('?');
  const path = pathPart?.startsWith('/') ? pathPart : `/${pathPart ?? ''}`;
  const query: Record<string, string> = {};
  if (queryPart) {
    for (const [k, v] of new URLSearchParams(queryPart).entries()) query[k] = v;
  }
  return {
    path,
    segments: path.split('/').filter(Boolean).map(decodeURIComponent),
    query,
  };
}

interface RouterValue {
  route: Route;
  navigate: (path: string, opts?: { replace?: boolean }) => void;
  /** convenience — active top-level segment ('' for home) */
  section: string;
}

const RouterContext = createContext<RouterValue>({
  route: { path: '/', segments: [], query: {} },
  navigate: () => undefined,
  section: '',
});

export function navigate(path: string, opts?: { replace?: boolean }) {
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (opts?.replace) {
    window.history.replaceState(null, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (window.location.hash !== target) {
    window.location.hash = target;
  } else {
    // same-path navigation — still scroll to top (explicit re-entry)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }
}

export function HashRouter({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ path: '/', segments: [], query: {} });

  useEffect(() => {
    const sync = () => {
      const next = parseHash();
      setRoute((prev) =>
        prev.path === next.path &&
        prev.segments.join('/') === next.segments.join('/') &&
        JSON.stringify(prev.query) === JSON.stringify(next.query)
          ? prev
          : next,
      );
      // scroll management: to top on path change; honour in-page anchors
      const anchor = next.segments.length === 0 && window.location.hash.includes('#/')
        ? undefined
        : document.getElementById(next.segments[next.segments.length - 1]);
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const nav = useCallback((path: string, opts?: { replace?: boolean }) => {
    navigate(path, opts);
  }, []);

  const value = useMemo<RouterValue>(
    () => ({ route, navigate: nav, section: route.segments[0] ?? '' }),
    [route, nav],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  return useContext(RouterContext);
}

/** Anchor that participates in hash routing (left/middle click stays native). */
export function Link({
  to,
  children,
  className,
  onClick,
  ariaLabel,
  ariaCurrent,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  ariaCurrent?: boolean;
}) {
  const href = `#${to.startsWith('/') ? to : `/${to}`}`;
  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      aria-current={ariaCurrent ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
