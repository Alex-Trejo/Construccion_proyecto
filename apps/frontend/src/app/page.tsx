/**
 * @fileoverview Landing Page (pública) — Neo-Brutalist (Positivus style).
 *
 * Hero con CTA de login. El botón delega la autenticación a Keycloak
 * vía NextAuth (`signIn('keycloak')`). Si ya hay sesión, va al dashboard.
 *
 * @module LandingPage
 */

'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from '@/lib/i18n/language-provider';

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const handleLogin = () => {
    if (status === 'authenticated') {
      router.push('/dashboard');
      return;
    }
    void signIn('keycloak', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-black bg-primary font-extrabold">
            S
          </span>
          <span className="text-xl font-bold tracking-tight">SGC</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Button variant="dark" onClick={handleLogin}>
            {status === 'authenticated'
              ? t('landing.goDashboard')
              : t('landing.login')}
          </Button>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-12 py-12 md:grid-cols-2 md:py-20">
          <div className="animate-fade-in-up flex flex-col gap-6">
            <span className="brutal-badge w-fit bg-primary">
              {t('landing.badge')}
            </span>
            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              {t('landing.heroTitleA')}{' '}
              <span className="rounded-lg bg-primary px-2">
                {t('landing.heroTitleHighlight')}
              </span>{' '}
              {t('landing.heroTitleB')}
            </h1>
            <p className="max-w-md text-lg text-dark/70">
              {t('landing.heroDesc')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" onClick={handleLogin}>
                {t('landing.getStarted')}
              </Button>
              <a href="#features">
                <Button variant="secondary">{t('landing.learnMore')}</Button>
              </a>
            </div>
          </div>

          <div className="brutal-card animate-fade-in-up bg-secondary p-8">
            <div className="flex flex-col gap-4">
              <FeatureRow
                title={t('landing.feat.imap.title')}
                desc={t('landing.feat.imap.desc')}
              />
              <FeatureRow
                title={t('landing.feat.xsd.title')}
                desc={t('landing.feat.xsd.desc')}
              />
              <FeatureRow
                title={t('landing.feat.storage.title')}
                desc={t('landing.feat.storage.desc')}
              />
              <FeatureRow
                title={t('landing.feat.sso.title')}
                desc={t('landing.feat.sso.desc')}
              />
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <section id="features" className="grid gap-6 py-12 md:grid-cols-3">
          <FeatureCard
            n="01"
            title={t('landing.card.suppliers.title')}
            desc={t('landing.card.suppliers.desc')}
            highlight
          />
          <FeatureCard
            n="02"
            title={t('landing.card.communications.title')}
            desc={t('landing.card.communications.desc')}
          />
          <FeatureCard
            n="03"
            title={t('landing.card.pipeline.title')}
            desc={t('landing.card.pipeline.desc')}
          />
        </section>
      </main>

      <footer className="border-t-2 border-black">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-dark/60">
          {t('landing.footer', { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}

function FeatureRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="brutal-card-sm flex items-center gap-3 bg-white p-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 border-black bg-primary text-sm font-bold">
        ✓
      </span>
      <div>
        <p className="font-bold leading-tight">{title}</p>
        <p className="text-sm text-dark/60">{desc}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  n,
  title,
  desc,
  highlight = false,
}: {
  n: string;
  title: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div className={`brutal-card p-8 ${highlight ? 'bg-primary' : 'bg-secondary'}`}>
      <span className="text-4xl font-extrabold opacity-30">{n}</span>
      <h3 className="mt-4 text-2xl font-bold">{title}</h3>
      <p className="mt-2 text-dark/70">{desc}</p>
    </div>
  );
}
