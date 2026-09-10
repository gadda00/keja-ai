'use client';
/** Account — profile, sign-in (demo), favorites, saved searches, language. */
import { useState } from 'react';
import { Bell, Globe, Heart, LogIn, LogOut, Search, Settings, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useSavedSearches } from '@/lib/searchStore';
import { useAllProperties } from '@/lib/inventory';
import { LANGUAGES, useI18n } from '@/lib/i18n';
import { navigate } from '@/lib/router';
import { PropertyRow } from '@/components/property/PropertyCard';
import { cn } from '@/lib/utils';

export default function AccountView() {
  const { user, loginWithEmail, logout, register } = useAuth();
  const all = useAllProperties();
  const [favorites] = useStore<string[]>('favorites', []);
  const { searches, remove, toggleAlerts } = useSavedSearches();
  const { lang, setLang } = useI18n();
  const [email, setEmail] = useState('');

  const saved = all.filter((p) => favorites.includes(p.id));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* profile header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground">
            <User className="h-7 w-7" aria-hidden />
          </div>
          <div>
            {user ? (
              <>
                <h1 className="text-xl font-black">{user.name}</h1>
                <p className="text-sm text-muted-foreground">{user.email} · role: {user.role}</p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-black">Guest session</h1>
                <p className="text-sm text-muted-foreground">Your data lives on this device — sign in to carry it across sessions.</p>
              </>
            )}
          </div>
        </div>
        {user ? (
          <Button variant="outline" className="font-bold" onClick={() => logout()}>
            <LogOut className="mr-1.5 h-4 w-4" aria-hidden /> Sign out
          </Button>
        ) : (
          <Button
            className="font-bold"
            onClick={() =>
              register({ name: email.split('@')[0] || 'Keja Guest', email: email || 'demo@keja.app', password: 'demo-trial-2026' })
            }
          >
            <LogIn className="mr-1.5 h-4 w-4" aria-hidden /> Continue (demo account)
          </Button>
        )}
      </div>

      {!user && (
        <div className="mt-4 max-w-sm rounded-2xl border bg-card p-4">
          <Label htmlFor="acc-email">Email (demo)</Label>
          <div className="mt-1.5 flex gap-2">
            <Input id="acc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Trial build: sessions persist locally with a 12h sliding window. Google Sign-In wires to a real client ID when the backend ships.
          </p>
        </div>
      )}

      <Tabs defaultValue="favorites" className="mt-7">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="favorites" className="gap-1.5 font-bold"><Heart className="h-4 w-4" aria-hidden /> Saved homes ({saved.length})</TabsTrigger>
          <TabsTrigger value="searches" className="gap-1.5 font-bold"><Bell className="h-4 w-4" aria-hidden /> Saved searches ({searches.length})</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 font-bold"><Settings className="h-4 w-4" aria-hidden /> Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="mt-6">
          {saved.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card/60 p-10 text-center">
              <Heart className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
              <p className="mt-3 text-sm font-bold">Nothing saved yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any listing to keep it here.</p>
              <Button className="mt-4 font-bold" onClick={() => navigate('/properties')}>Discover properties</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {saved.map((p) => (
                <PropertyRow key={p.id} property={p} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="searches" className="mt-6">
          {searches.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card/60 p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
              <p className="mt-3 text-sm font-bold">No saved searches</p>
              <p className="mt-1 text-sm text-muted-foreground">Save any search on the discovery page and we&rsquo;ll alert you on new matches.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {searches.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">
                      saved {new Date(s.createdAt).toLocaleDateString('en-KE')} · {s.alerts ? 'alerts on' : 'alerts off'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold"
                    onClick={() => navigate(`/properties${s.filters.q ? `?q=${encodeURIComponent(s.filters.q)}` : ''}`)}
                  >
                    Run search
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-bold" onClick={() => toggleAlerts(s.id)}>
                    {s.alerts ? 'Mute' : 'Unmute'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-destructive" onClick={() => remove(s.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                <Globe className="h-4 w-4 text-gold" aria-hidden /> Language · Lugha · Langue
              </h2>
              <div className="mt-3 grid gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition-colors',
                      lang === l.code ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/40',
                    )}
                  >
                    {l.label}
                    {lang === l.code && <Badge className="border-0 bg-primary text-[9px]">active</Badge>}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Longer term: Kinyarwanda, Luganda, Amharic and Arabic as Keja expands across Africa.
              </p>
            </div>
            <div className="rounded-3xl border bg-card p-5">
              <h2 className="text-sm font-black uppercase tracking-wider">Data & privacy</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This trial stores everything locally: favorites, searches, portfolio, chat history
                and the tokenization trial wallet never leave this device. Clearing browser data
                resets the platform.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 font-bold text-destructive"
                onClick={() => {
                  const keys = Object.keys(localStorage).filter((k) => k.startsWith('keja:'));
                  keys.forEach((k) => localStorage.removeItem(k));
                  window.location.reload();
                }}
              >
                Clear all Keja data on this device
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
