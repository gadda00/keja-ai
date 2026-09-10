'use client';
/**
 * Floating WhatsApp support entry — the human escalation path that pairs
 * with the AI advisor (proposal §8 diaspora "WhatsApp support").
 */
import { MessageCircle } from 'lucide-react';
import { whatsappLink } from '@/config';

export function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink('Hello Keja AI — I would like to speak with the team.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Keja on WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 md:bottom-6 md:right-6"
    >
      <MessageCircle className="h-6 w-6" aria-hidden />
    </a>
  );
}
