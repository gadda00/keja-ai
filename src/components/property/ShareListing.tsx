'use client';
/**
 * Share a listing (wave 20) — WhatsApp-first, with the QR poster.
 *
 * Kenya shares property the way it shares everything: a WhatsApp forward.
 * The detail page could enquire at the Keja desk but could never *forward*
 * a listing — to the family group, the diaspora aunt financing it, the
 * lawyer. This button closes that loop: WhatsApp (share picker), the OS
 * sheet where it exists, copy-link, and a print-ready QR poster (the
 * agent's window-card) — all off the pure `@/lib/share` kit.
 */
import { useEffect, useState } from 'react';
import { Check, Copy, Download, MessageCircle, QrCode, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { passportId } from '@/lib/passport';
import {
  canNativeShare, drawPoster, listingClipboardText, listingShareText,
  listingUrl, listingSummary, nativeShareListing, posterSpec, whatsappShareLink,
} from '@/lib/share';
import type { Property } from '@/data/properties';
import { cn } from '@/lib/utils';

export function ShareListing({ p }: { p: Property }) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);

  // QR preview renders only while the dialog is open (dynamic import — the
  // qrcode chunk is the same one 2FA already loads, nothing new in the boot)
  useEffect(() => {
    if (!open) {
      setQr(null);
      setCopied(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const data = await QRCode.toDataURL(listingUrl(p), {
          width: 220,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        if (!cancelled) setQr(data);
      } catch {
        if (!cancelled) setQr(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, p]);

  const copyLink = async () => {
    const text = listingClipboardText(p);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Link copied', description: 'Paste it anywhere — WhatsApp, email, SMS.' });
      track({ event: 'share', propertyId: p.id, channel: 'link' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select the link text below and copy manually.' });
    }
  };

  const shareNative = async () => {
    const ok = await nativeShareListing(p);
    if (ok) track({ event: 'share', propertyId: p.id, channel: 'native' });
  };

  const downloadPoster = async () => {
    setPosterBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 960;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      const img = new Image();
      await drawPoster(ctx, posterSpec(p), async (url, size) => {
        const QRCode = (await import('qrcode')).default;
        return QRCode.toDataURL(url, { width: size, margin: 1, color: { dark: '#ffffff', light: '#0f172a' } });
      }, img);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('poster blob failed');
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${passportId(p)}-poster.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 4000);
      track({ event: 'share', propertyId: p.id, channel: 'poster' });
      toast({ title: 'Poster downloaded', description: 'Print it, pin it at the property — the QR opens the live listing.' });
    } catch {
      toast({ title: 'Poster failed', description: 'The flyer could not render on this device.' });
    } finally {
      setPosterBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="font-bold"
        onClick={() => setOpen(true)}
        aria-label={`Share ${p.title}`}
      >
        <Share2 className="h-4 w-4" aria-hidden /> Share
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-gold" aria-hidden /> Share this listing
            </DialogTitle>
            <DialogDescription>
              {listingSummary(p)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            {/* QR preview */}
            <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
              <div className="flex h-[110px] w-[110px] shrink-0 items-center justify-center rounded-xl border bg-white">
                {qr ? (
                  <img src={qr} alt={`QR code for ${p.title}`} className="h-[104px] w-[104px]" />
                ) : (
                  <QrCode className="h-8 w-8 text-muted-foreground/40" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Scan to open</p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={listingUrl(p)}>
                  {listingUrl(p).replace(/^https?:\/\//, '')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-8 text-xs font-bold"
                  disabled={posterBusy}
                  onClick={downloadPoster}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  {posterBusy ? 'Rendering…' : 'QR poster (PNG)'}
                </Button>
              </div>
            </div>

            {/* the link, selectable */}
            <div className="flex items-center gap-2 rounded-xl border bg-accent/40 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{listingUrl(p)}</span>
              <Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs font-bold" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {/* channels */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={whatsappShareLink(listingShareText(p))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track({ event: 'share', propertyId: p.id, channel: 'whatsapp' })}
                className="col-span-2"
              >
                <Button className="w-full bg-[#25D366] font-black text-white hover:bg-[#25D366]/90">
                  <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> Share on WhatsApp
                </Button>
              </a>
              {canNativeShare() && (
                <Button variant="outline" className="font-bold" onClick={shareNative}>
                  <Share2 className="mr-1.5 h-4 w-4" aria-hidden /> More apps…
                </Button>
              )}
              <Button
                variant={canNativeShare() ? 'outline' : 'outline'}
                className={cn('font-bold', !canNativeShare() && 'col-span-2')}
                onClick={copyLink}
              >
                <Copy className="mr-1.5 h-4 w-4" aria-hidden /> Copy link &amp; details
              </Button>
            </div>
          </div>

          <DialogFooter className="flex-col items-start gap-1 sm:flex-col sm:items-start">
            <p className="text-[11px] leading-snug text-muted-foreground">
              The QR poster prints the passport id, price and trust score as verified today —
              scanners land on this live page, so the evidence stays current.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
