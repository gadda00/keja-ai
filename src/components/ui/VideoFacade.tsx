import { MonitorPlay, Play } from 'lucide-react';
import { useState } from 'react';

import SmartImg from '@/components/ui/SmartImg';

interface VideoFacadeProps {
  /** YouTube video id, e.g. "zDlefHy09pg" */
  videoId: string;
  title: string;
  channel: string;
  /** poster image (JPG path under public/ — .webp auto-paired by SmartImg) */
  poster: string;
  posterAlt: string;
  className?: string;
}

/**
 * Privacy- and performance-friendly YouTube embed.
 *
 * Nothing loads from Google until the visitor explicitly presses play —
 * the facade is a plain poster image + button (no third-party JS, no
 * tracking pixels on page load). After the click, the video mounts through
 * the privacy-enhanced youtube-nocookie.com domain.
 */
export default function VideoFacade({
  videoId,
  title,
  channel,
  poster,
  posterAlt,
  className,
}: VideoFacadeProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={`relative aspect-video w-full overflow-hidden bg-ink ${className ?? ''}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          sandbox="allow-scripts allow-popups allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className={`group relative overflow-hidden ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play video: ${title} — loads the YouTube player`}
        className="relative block w-full cursor-pointer text-left"
      >
        <SmartImg
          src={poster}
          alt={posterAlt}
          className="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-ink/5" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 shadow-gold-md ring-4 ring-white/40 transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-1 h-7 w-7 text-white" fill="currentColor" aria-hidden="true" />
          </span>
        </span>
        <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white">
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-wide2 text-gold-300">
              Watch · {channel}
            </span>
            <span className="mt-0.5 block text-sm font-semibold leading-snug sm:text-base">
              {title}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
            <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" /> YouTube
          </span>
        </span>
      </button>
    </div>
  );
}
