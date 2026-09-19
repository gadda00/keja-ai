'use client';
/**
 * ListingManageCard — one account-owned listing with its full lifecycle
 * controls (wave 17).
 *
 * "The listings should also work" — until now My-listings surfaces were
 * read-only: an owner could not mark a unit sold/let, reserve it, or
 * withdraw it, and the marketplace kept advertising stale stock forever.
 * This card is the shared owner control used by BOTH the account page
 * (My listings) and the developer workspace:
 *
 *  - review status chip (pending / approved / rejected) from the linked
 *    submission — the verification queue state, visible to the poster;
 *  - availability cycle: available → reserved → sold → re-list, which the
 *    marketplace card mirrors immediately (Sold badge, filters);
 *  - withdraw: removes the listing AND resolves the linked submission as
 *    rejected ('withdrawn by owner') so the admin queue stays coherent —
 *    every decision lands in the audit trail.
 */
import { useState } from 'react';
import { Ban, Building2, CheckCircle2, Clock, Eye, Home, PencilLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  useSubmissions,
  useUserListings,
  logAudit,
  type UserListing,
} from '@/lib/adminStore';
import { useAuth } from '@/lib/auth';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

const REVIEW_CHIP: Record<string, { label: string; className: string }> = {
  pending: { label: 'In review', className: 'border-gold/50 text-gold-foreground' },
  approved: { label: 'Verified', className: 'border-primary/40 text-primary' },
  rejected: { label: 'Rejected', className: 'border-destructive/40 text-destructive' },
  flagged: { label: 'Flagged', className: 'border-destructive/40 text-destructive' },
};

const AVAILABILITY_CHIP: Record<UserListing['availability'], string> = {
  available: 'border-border text-muted-foreground',
  reserved: 'border-gold/50 text-gold-foreground',
  sold: 'border-primary/40 text-primary',
};

export function ListingManageCard({ listing }: { listing: UserListing }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userListings, setUserListings] = useUserListings();
  const [submissions, setSubmissions] = useSubmissions();
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  const submission = listing.submissionId
    ? submissions.find((s) => s.id === listing.submissionId)
    : undefined;
  const review = REVIEW_CHIP[submission?.status ?? 'pending'] ?? REVIEW_CHIP.pending;

  const patchListing = (patch: Partial<UserListing>) => {
    const next = userListings.map((l) => (l.id === listing.id ? { ...l, ...patch } : l));
    setUserListings(next);
  };

  const setAvailability = (availability: UserListing['availability'], label: string) => {
    patchListing({ availability });
    logAudit({
      actor: user?.name ?? 'Account owner',
      actorEmail: user?.email ?? listing.ownerEmail ?? 'unknown',
      action: 'listing.availability',
      target: listing.title,
      detail: `Marked ${label} (${listing.id})`,
      severity: 'info',
    });
    toast({ title: `Marked as ${label}`, description: 'The marketplace view updated instantly.' });
  };

  const withdraw = () => {
    setUserListings(userListings.filter((l) => l.id !== listing.id));
    if (listing.submissionId) {
      setSubmissions(
        submissions.map((s) =>
          s.id === listing.submissionId
            ? {
                ...s,
                status: 'rejected' as const,
                reviewNote: 'Withdrawn by the owner from My listings.',
                reviewedAt: new Date().toISOString(),
                reviewedBy: user?.name ?? 'Owner',
              }
            : s,
        ),
      );
    }
    logAudit({
      actor: user?.name ?? 'Account owner',
      actorEmail: user?.email ?? listing.ownerEmail ?? 'unknown',
      action: 'listing.withdrawn',
      target: listing.title,
      detail: `Listing ${listing.id} withdrawn by the owner — removed from the marketplace`,
      severity: 'warning',
    });
    setConfirmingWithdraw(false);
    toast({
      title: 'Listing withdrawn',
      description: 'It is no longer visible in the marketplace on this device.',
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            className="line-clamp-1 text-left text-sm font-bold hover:text-primary"
            onClick={() => navigate(`/properties/${listing.id}`)}
          >
            {listing.title}
          </button>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {listing.area}, {listing.county} · {listing.type} ·{' '}
            <span className="tabular-nums">{formatKES(listing.price)}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant="outline" className={cn('text-[10px] font-bold', review.className)}>
            {review.label}
          </Badge>
          <Badge
            variant="outline"
            className={cn('text-[10px] font-bold capitalize', AVAILABILITY_CHIP[listing.availability])}
          >
            {listing.availability}
          </Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" aria-hidden /> {listing.views} views
          </span>
          <span className="inline-flex items-center gap-1">
            <PencilLine className="h-3 w-3" aria-hidden />
            listed {new Date(listing.listedAt).toLocaleDateString('en-KE')}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {listing.availability === 'available' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[11px] font-bold"
                onClick={() => setAvailability('reserved', 'reserved')}
              >
                <Clock className="mr-1 h-3 w-3" aria-hidden /> Reserve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[11px] font-bold text-primary"
                onClick={() => setAvailability('sold', 'sold / let')}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden /> Mark sold
              </Button>
            </>
          )}
          {listing.availability === 'reserved' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[11px] font-bold text-primary"
              onClick={() => setAvailability('sold', 'sold / let')}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden /> Mark sold
            </Button>
          )}
          {listing.availability !== 'available' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[11px] font-bold"
              onClick={() => setAvailability('available', 'available')}
            >
              <Home className="mr-1 h-3 w-3" aria-hidden /> Re-list
            </Button>
          )}
          {confirmingWithdraw ? (
            <span className="flex items-center gap-1.5">
              <Button size="sm" className="h-7 px-2.5 text-[11px] font-bold text-destructive-foreground bg-destructive" onClick={withdraw}>
                Confirm withdraw
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-[11px] font-bold"
                onClick={() => setConfirmingWithdraw(false)}
              >
                Cancel
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-[11px] font-bold text-destructive"
              onClick={() => setConfirmingWithdraw(true)}
            >
              <Ban className="mr-1 h-3 w-3" aria-hidden /> Withdraw
            </Button>
          )}
        </div>
      </div>

      {submission?.status === 'pending' && (
        <p className="mt-3 rounded-lg bg-gold-soft border border-gold/30 px-3 py-2 text-[11px] leading-relaxed text-gold-foreground">
          The verification desk screens every submission — title and registry checks stay pending
          until then. Complete listings (photos, 120+ character description, amenities) review
          faster.
        </p>
      )}
    </div>
  );
}

/** Empty-state block shared by every owner surface. */
export function ListingEmptyState({ cta = 'Post a property' }: { cta?: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 p-8 text-center">
      <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
      <p className="mt-3 text-sm font-bold">No properties posted yet</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Publish your first property with the guided wizard — pricing feedback and verification
        screens included.
      </p>
      <Button className="mt-4 font-bold" onClick={() => navigate('/sell')}>
        {cta}
      </Button>
    </div>
  );
}
