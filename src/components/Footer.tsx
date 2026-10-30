import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.tsx';

export const Footer: React.FC = () => {
  const { lang, setLang, t } = useI18n();

  return (
    <footer className="bg-white border-t border-[#EEDDE5] mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <p className="font-serif-title text-3xl text-[#762747] font-semibold tracking-wide">
              Joseph &amp; Marie
            </p>
            <p className="text-sm text-[#796670] mt-1">
              {t.publicPage.kicker} · {t.publicPage.themeBadge}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#796670]">
            <Link to="/" className="hover:text-[#30232B] transition-colors whitespace-nowrap">
              {t.nav.home}
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/confidentialite" className="hover:text-[#30232B] transition-colors whitespace-nowrap">
              {t.nav.privacy}
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/admin" className="hover:text-[#30232B] transition-colors whitespace-nowrap">
              {t.nav.admin}
            </Link>
          </div>

          {/* Language Switcher FR / EN */}
          <div
            role="group"
            aria-label="Sélecteur de langue"
            className="flex items-center gap-1 p-1 bg-[#FFF8FB] border border-[#EEDDE5] rounded-full shrink-0"
          >
            <button
              type="button"
              onClick={() => setLang('fr')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                lang === 'fr'
                  ? 'bg-[#A93665] text-white'
                  : 'text-[#796670] hover:text-[#30232B]'
              }`}
            >
              Français (FR)
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                lang === 'en'
                  ? 'bg-[#A93665] text-white'
                  : 'text-[#796670] hover:text-[#30232B]'
              }`}
            >
              English (EN)
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#EEDDE5]/70 text-center text-xs text-[#796670]">
          <p>© 2026 Joseph &amp; Marie · Célébration privée sur invitation personnelle.</p>
        </div>
      </div>
    </footer>
  );
};
