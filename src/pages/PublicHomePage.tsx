import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, ArrowRight, ShieldCheck, Calendar, MailOpen } from 'lucide-react';
import { HeaderBubble } from '../components/HeaderBubble.tsx';
import { Footer } from '../components/Footer.tsx';
import { FloralDivider } from '../components/FloralDivider.tsx';
import { Envelope3DOverlay } from '../components/Envelope3DOverlay.tsx';
import { WeddingCountdown } from '../components/WeddingCountdown.tsx';
import { NosMomentsGallery } from '../components/NosMomentsGallery.tsx';
import { PracticalInfoFaq } from '../components/PracticalInfoFaq.tsx';
import { useI18n } from '../i18n/I18nContext.tsx';

interface DemoLink {
  id: string;
  displayName: string;
  invitationType: string;
  maxTotal: number;
  token: string;
  authorizedEventTitlesFr: string[];
  authorizedEventTitlesEn: string[];
}

interface PublicHomePageProps {
  initialSection?: string;
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({ initialSection }) => {
  const { lang, t } = useI18n();
  const [demoLinks, setDemoLinks] = useState<DemoLink[]>([]);

  // 3D Envelope pop-up on site launch
  const [envelopeOpened, setEnvelopeOpened] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('jm_public_envelope_opened') === '1';
    } catch {
      return false;
    }
  });

  const handleOpenEnvelope = () => {
    setEnvelopeOpened(true);
    try {
      sessionStorage.setItem('jm_public_envelope_opened', '1');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.title = t.meta.title;
    fetch('/api/public/summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.demoLinks)) {
          setDemoLinks(data.demoLinks);
        }
      })
      .catch(() => {
        // Silent fallback if offline
      });
  }, [t.meta.title]);

  useEffect(() => {
    if (initialSection) {
      setEnvelopeOpened(true);
      const timer = setTimeout(() => {
        const el = document.getElementById(initialSection);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [initialSection]);

  const navItems = [
    { label: t.nav.home, href: '#accueil' },
    { label: t.nav.editorial, href: '#union' },
    { label: lang === 'fr' ? 'Nos Moments' : 'Our Moments', href: '#nos-moments' },
    { label: lang === 'fr' ? 'Infos Pratiques' : 'Practical Info', href: '#infos-pratiques' },
    { label: lang === 'fr' ? 'Accès invité' : 'Guest Access', href: '#acces-prive' },
    { label: t.nav.privacy, href: '/confidentialite' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8FB] text-[#30232B]">
      {/* 3D Pop-up Envelope with Pink Neon Circumference Button on Site Launch */}
      <Envelope3DOverlay
        isOpen={envelopeOpened}
        onOpen={handleOpenEnvelope}
      />

      <HeaderBubble
        navItems={navItems}
        ctaLabel={t.nav.admin}
        ctaHref="/admin"
      />

      <main className="flex-1">
        {/* FULL SCREEN HERO SECTION WITH COUPLE BACKGROUND IMAGE & SEMI-TRANSPARENT BLACK OVERLAY */}
        <section id="accueil" className="relative w-full min-h-[100dvh] flex items-center justify-center overflow-hidden">
          {/* Couple Background Image */}
          <img
            src="/assets/aistudio/Portrait_de_mariage_romantique_et__l_gant_0c88a360.png"
            alt="Portrait de mariage de Joseph et Marie"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center scale-102"
          />

          {/* Semi-transparent black overlay allowing the couple image behind to be clearly seen */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
          />

          {/* Hero Foreground Content */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-24 pb-12 sm:pt-28 sm:pb-16 sm:px-8 md:px-12 text-center text-white"
          >
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm font-medium text-[#F6D6E2] tracking-wider px-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EBAFC5] shrink-0" />
              <span>{t.publicPage.kicker}</span>
              <span aria-hidden="true">·</span>
              <span>{t.publicPage.themeBadge}</span>
            </div>

            <h1
              className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mt-3 sm:mt-4 tracking-tight drop-shadow-md"
              style={{ textWrap: 'balance' }}
            >
              {t.publicPage.headline}
            </h1>

            <p className="text-base sm:text-xl md:text-2xl text-[#F6D6E2] font-light mt-2.5 sm:mt-3 px-2">
              {t.publicPage.subheadline}
            </p>

            <p className="text-xs sm:text-base text-white/95 leading-relaxed mt-4 sm:mt-5 max-w-2xl mx-auto px-2">
              {t.publicPage.mainMessage}{' '}
              <span className="text-white/85">{t.publicPage.personalLinkInstruction}</span>
            </p>

            {/* ELEGANT COUNTDOWN COMPONENT (Days, Hours, Minutes, Seconds) */}
            <div className="mt-7 sm:mt-9 pt-6 sm:pt-8 border-t border-white/20">
              <WeddingCountdown variant="hero" />
            </div>

            {/* Hero Actions */}
            <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
              <a
                href="#acces-prive"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('acces-prive')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 text-xs sm:text-sm font-medium text-white bg-[#A93665] hover:bg-[#762747] rounded-full transition-colors whitespace-nowrap shrink-0 shadow-lg cursor-pointer"
              >
                <span>
                  {lang === 'fr'
                    ? 'Accéder aux invitations privées'
                    : 'Access Private Invitations'}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </a>

              <button
                type="button"
                onClick={() => setEnvelopeOpened(false)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-xs sm:text-sm font-medium text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MailOpen className="w-4 h-4 text-[#F6D6E2] shrink-0" />
                <span>
                  {lang === 'fr' ? 'Revoir l’enveloppe 3D' : 'Replay 3D Envelope'}
                </span>
              </button>
            </div>
          </motion.div>
        </section>

        <FloralDivider />

        {/* EDITORIAL SECTION */}
        <section id="union" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="bg-white border border-[#EEDDE5] rounded-3xl p-5 sm:p-10 md:p-14 shadow-[0_12px_40px_rgb(118,39,71,0.04)]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
              <div className="md:col-span-7 space-y-4 sm:space-y-5">
                <p className="text-xs font-medium text-[#A93665] tracking-wider uppercase">
                  {lang === 'fr' ? '01. Notre Engagement' : '01. Our Commitment'}
                </p>
                <h2
                  className="text-2xl sm:text-4xl font-semibold text-[#30232B]"
                  style={{ textWrap: 'balance' }}
                >
                  {t.publicPage.editorialTitle}
                </h2>
                <p className="text-sm sm:text-base text-[#30232B] leading-relaxed">
                  {t.publicPage.editorialP1}
                </p>
                <p className="text-sm sm:text-base text-[#796670] leading-relaxed">
                  {t.publicPage.editorialP2}
                </p>
                <p className="text-sm sm:text-base text-[#762747] font-medium leading-relaxed">
                  {t.publicPage.editorialP3}
                </p>
              </div>

              <div className="md:col-span-5">
                <div className="rounded-2xl overflow-hidden border border-[#EEDDE5] bg-[#FFF8FB]">
                  <img
                    src="/assets/aistudio/Alliance_dor_e_de_Joseph_et_Marie_e0fc02ff.png"
                    alt="Alliances dorées de Joseph et Marie"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-56 sm:h-72 object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* "NOS MOMENTS" ROMANTIC & FLORAL GALLERY SECTION */}
        <NosMomentsGallery />

        {/* PRACTICAL INFORMATION & INTERACTIVE FAQ SECTION */}
        <PracticalInfoFaq />

        {/* PRIVATE LINK ACCESS & INTERACTIVE VERIFICATION LINKS */}
        <section id="acces-prive" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="bg-white border border-[#EEDDE5] rounded-3xl p-5 sm:p-10 md:p-12">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="p-3 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] text-[#A93665] shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-[#30232B]">
                  {t.publicPage.privateAccessNoticeTitle}
                </h2>
                <p className="text-sm sm:text-base text-[#796670] mt-2 leading-relaxed max-w-3xl">
                  {t.publicPage.privateAccessNoticeBody}
                </p>
              </div>
            </div>

            {demoLinks.length > 0 && (
              <div className="mt-10 pt-8 border-t border-[#EEDDE5]">
                <div className="flex items-center gap-2 text-xs font-medium text-[#762747] uppercase tracking-wider">
                  <span>{t.publicPage.demoSectionTitle}</span>
                </div>
                <p className="text-sm text-[#796670] mt-1">
                  {t.publicPage.demoSectionSubtitle}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {demoLinks.map((demo) => {
                    const titles =
                      lang === 'fr'
                        ? demo.authorizedEventTitlesFr
                        : demo.authorizedEventTitlesEn;
                    return (
                      <Link
                        key={demo.id}
                        to={`/invitation/${demo.token}`}
                        className="group flex flex-col justify-between p-5 rounded-2xl bg-[#FFF8FB] hover:bg-[#F6D6E2]/35 border border-[#EEDDE5] transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-lg font-semibold text-[#30232B] group-hover:text-[#A93665] transition-colors">
                              {demo.displayName}
                            </span>
                            <span className="text-xs text-[#762747] tabular-nums">
                              {demo.maxTotal} {lang === 'fr' ? 'place(s)' : 'seat(s)'}
                            </span>
                          </div>
                          <p className="text-xs text-[#796670] mt-2 leading-relaxed">
                            {titles.join(' · ')}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#EEDDE5]/80 flex items-center justify-between text-xs font-medium text-[#A93665]">
                          <span>
                            {lang === 'fr'
                              ? 'Ouvrir cette invitation privée'
                              : 'Open this private invitation'}
                          </span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs text-[#796670]">
                  <ShieldCheck className="w-4 h-4 text-[#A93665] shrink-0" />
                  <span>
                    {lang === 'fr'
                      ? 'Contrôle serveur actif : chaque lien ne télécharge depuis l’API que les événements cochés pour cet invité.'
                      : 'Active server-side control: each link only downloads from the API the events checked for that guest.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
