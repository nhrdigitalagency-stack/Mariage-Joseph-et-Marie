import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.tsx';

export interface NavItem {
  label: string;
  href: string;
}

interface HeaderBubbleProps {
  navItems: NavItem[];
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}

export const HeaderBubble: React.FC<HeaderBubbleProps> = ({
  navItems,
  ctaLabel,
  ctaHref,
  onCtaClick,
}) => {
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    // Case 1: Pure anchor link like "#union", "#nos-moments", "#rsvp"
    if (href.startsWith('#')) {
      const targetId = href.slice(1);
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Navigate to home page with hash so ScrollAndHashManager scrolls to it
        navigate(`/${href}`);
      }
      return;
    }

    // Case 2: Root + anchor link like "/#union"
    if (href.startsWith('/#')) {
      const targetId = href.slice(2);
      if (location.pathname === '/') {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      navigate(href);
      return;
    }

    // Case 3: Standard SPA route like "/", "/confidentialite", "/admin"
    navigate(href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="fixed top-3 sm:top-4 inset-x-0 z-40 px-3 sm:px-6 pointer-events-none">
      <div className="max-w-6xl mx-auto pointer-events-auto">
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-2.5 sm:py-3 bg-white/55 backdrop-blur-md border border-[#EEDDE5]/70 rounded-full shadow-[0_8px_30px_rgb(118,39,71,0.08)]">
          {/* Zone 1: Brand Monogram J & M */}
          <Link
            to="/"
            onClick={(e) => handleNavigation(e, '/')}
            className="text-lg sm:text-2xl font-bold tracking-wider text-[#762747] hover:text-[#A93665] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A93665] rounded-full px-1"
            aria-label="Joseph & Marie — Accueil"
          >
            J &amp; M
          </Link>

          {/* Zone 2: Desktop Single-Line Navigation Links (lg and up so tablets never overflow) */}
          <nav
            aria-label="Navigation principale"
            className="hidden lg:flex items-center gap-4 xl:gap-6 text-xs xl:text-sm font-medium text-[#30232B]"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavigation(e, item.href)}
                className="hover:text-[#A93665] hover:underline underline-offset-8 decoration-[#EBAFC5] transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#A93665] rounded"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: Primary Action + Mobile/Tablet Hamburger Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language quick toggle on desktop */}
            <div className="hidden xl:flex items-center gap-0.5 p-0.5 bg-white/70 border border-[#EEDDE5] rounded-full">
              <button
                type="button"
                onClick={() => setLang('fr')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors cursor-pointer ${
                  lang === 'fr' ? 'bg-[#A93665] text-white' : 'text-[#796670] hover:text-[#30232B]'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors cursor-pointer ${
                  lang === 'en' ? 'bg-[#A93665] text-white' : 'text-[#796670] hover:text-[#30232B]'
                }`}
              >
                EN
              </button>
            </div>

            {ctaLabel && (
              onCtaClick ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onCtaClick();
                  }}
                  className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-[#A93665] hover:bg-[#762747] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#762747]"
                >
                  {ctaLabel}
                </button>
              ) : (
                <a
                  href={ctaHref || '#rsvp'}
                  onClick={(e) => handleNavigation(e, ctaHref || '#rsvp')}
                  className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-[#A93665] hover:bg-[#762747] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#762747]"
                >
                  {ctaLabel}
                </a>
              )
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 text-[#30232B] bg-white/75 hover:bg-white rounded-full border border-[#EEDDE5] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#A93665]"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Accessible Mobile & Tablet Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu mobile"
            className="lg:hidden mt-2 p-4 sm:p-5 bg-white/95 backdrop-blur-md border border-[#EEDDE5] rounded-3xl shadow-2xl max-h-[80dvh] overflow-y-auto"
          >
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavigation(e, item.href)}
                  className="px-3.5 py-2.5 text-sm font-medium text-[#30232B] hover:bg-[#FFF8FB] active:bg-[#F6D6E2]/40 rounded-xl transition-colors cursor-pointer"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-4 pt-4 border-t border-[#EEDDE5] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium text-[#796670]">Langue / Language</span>
              <div className="flex items-center gap-1 p-1 bg-[#FFF8FB] border border-[#EEDDE5] rounded-full">
                <button
                  type="button"
                  onClick={() => setLang('fr')}
                  className={`px-3.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                    lang === 'fr' ? 'bg-[#A93665] text-white' : 'text-[#796670]'
                  }`}
                >
                  Français (FR)
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-3.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                    lang === 'en' ? 'bg-[#A93665] text-white' : 'text-[#796670]'
                  }`}
                >
                  English (EN)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
