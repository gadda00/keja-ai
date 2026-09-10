'use client';
/**
 * InstallPrompt — cross-platform PWA install UX.
 *
 * Android (Chrome/Samsung/Edge) + desktop Chromium fire `beforeinstallprompt`;
 * we capture it, show a native-quality banner and call `prompt()` on tap.
 * iOS Safari never fires it — there we show the Share → Add to Home Screen
 * walkthrough instead. Already-installed runs (display-mode: standalone /
 * iOS navigator.standalone) and Capacitor shells never see the banner.
 *
 * A `keja:show-install` CustomEvent on window force-reopens the sheet
 * (used by the footer "Install app" link).
 */
import { useCallback, useEffect, useState } from 'react';
import { Download, Share, PlusCircle, CheckSquare, X, Smartphone } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'keja.install.dismissedAt';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const SHOW_DELAY_MS = 2800;

function readDismissed(): boolean {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(t) && Date.now() - t < DISMISS_COOLDOWN_MS;
  } catch {
    return false; // storage disabled — default to showing
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true; // SSR — render nothing
  const mq = window.matchMedia?.('(display-mode: standalone)');
  return (mq?.matches ?? false) || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const apple = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ masquerades as desktop Safari with touch support
  const modernIpad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const webviewNotCapacitor = !/capacitor/i.test(ua);
  return (apple || modernIpad) && webviewNotCapacitor;
}

function isNativeShell(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && /capacitor/i.test(navigator.userAgent))
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isNativeShell() || isStandalone()) return;

    const onBip = (e: Event) => {
      e.preventDefault(); // keep our banner in control
      setDeferred(e as BeforeInstallPromptEvent);
      if (!readDismissed()) setVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };
    const onShow = () => {
      // Footer / menu entry — respects eligibility but ignores the cooldown
      setDeferred((d) => {
        if (d || isIosSafari()) setVisible(true);
        return d;
      });
    };

    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('keja:show-install', onShow as EventListener);

    // iOS: no beforeinstallprompt — surface the walkthrough after a beat
    const timer = window.setTimeout(() => {
      if (isIosSafari() && !readDismissed()) {
        setIos(true);
        setVisible(true);
      }
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('keja:show-install', onShow as EventListener);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    writeDismissed();
  }, []);

  const installNow = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setVisible(false);
    } else {
      setVisible(false); // user closed the native sheet — don't nag
    }
    setDeferred(null);
  }, [deferred]);

  if (!visible || installed) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Keja AI on your device"
      className="fixed inset-x-3 bottom-20 z-[70] md:bottom-6 md:left-auto md:right-6 md:w-[380px]"
    >
      <div className="relative rounded-2xl border border-border bg-background/97 p-5 shadow-2xl backdrop-blur-xl">
        <button
          onClick={dismiss}
          aria-label="Dismiss install suggestion"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold">Install Keja AI</p>
            <p className="text-xs text-muted-foreground">
              Full-screen app · works offline · faster
            </p>
          </div>
        </div>

        {deferred ? (
          <button
            onClick={installNow}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Install app
          </button>
        ) : ios ? (
          <ol className="mt-4 space-y-2.5">
            {[
              { icon: Share, text: 'Tap the Share button in Safari\u2019s toolbar' },
              { icon: PlusCircle, text: 'Choose “Add to Home Screen”' },
              { icon: CheckSquare, text: 'Tap “Add” — Keja AI lands on your home screen' },
            ].map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-3 w-3" />
                </span>
                <span className="leading-snug">{text}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
