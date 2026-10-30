import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, EyeOff, Trash2, Clock } from 'lucide-react';
import { HeaderBubble } from '../components/HeaderBubble.tsx';
import { Footer } from '../components/Footer.tsx';
import { useI18n } from '../i18n/I18nContext.tsx';

export const PrivacyPage: React.FC = () => {
  const { lang, t } = useI18n();

  useEffect(() => {
    document.title = `${t.privacy.title} — Joseph & Marie`;
  }, [t.privacy.title]);

  const navItems = [
    { label: t.nav.home, href: '/#accueil' },
    { label: t.nav.editorial, href: '/#union' },
    { label: lang === 'fr' ? 'Nos Moments' : 'Our Moments', href: '/#nos-moments' },
    { label: lang === 'fr' ? 'Infos Pratiques' : 'Practical Info', href: '/#infos-pratiques' },
    { label: lang === 'fr' ? 'Accès invité' : 'Guest Access', href: '/#acces-prive' },
    { label: t.nav.privacy, href: '/confidentialite' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8FB] text-[#30232B]">
      <HeaderBubble
        navItems={navItems}
        ctaLabel={t.nav.admin}
        ctaHref="/admin"
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12">
        <div className="bg-white border border-[#EEDDE5] rounded-3xl p-8 sm:p-12 space-y-8">
          <div>
            <p className="text-xs font-medium text-[#A93665] tracking-wider">
              RGPD &amp; Confidentialité événementielle
            </p>
            <h1 className="font-serif-title text-3xl sm:text-5xl font-semibold text-[#30232B] mt-2">
              {t.privacy.title}
            </h1>
            <p className="text-sm sm:text-base text-[#796670] mt-2">
              {t.privacy.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] space-y-2">
              <Shield className="w-5 h-5 text-[#A93665]" />
              <h2 className="font-serif-title text-xl font-semibold text-[#30232B]">
                {lang === 'fr' ? '1. Informations collectées' : '1. Information Collected'}
              </h2>
              <p className="text-xs sm:text-sm text-[#796670] leading-relaxed">
                {lang === 'fr'
                  ? 'Nous collectons uniquement les données strictement nécessaires à l’organisation du mariage de Joseph & Marie : nom et prénom des invités, réponses de présence par événement, préférences ou allergies alimentaires éventuelles, besoins d’accès, ainsi que les photos et messages volontairement soumis.'
                  : 'We only collect data strictly necessary for organizing Joseph & Marie’s wedding: guest names, attendance responses per event, optional dietary preferences or access needs, and voluntarily submitted photos or wishes.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] space-y-2">
              <Lock className="w-5 h-5 text-[#A93665]" />
              <h2 className="font-serif-title text-xl font-semibold text-[#30232B]">
                {lang === 'fr' ? '2. Confidentialité du lien personnel' : '2. Personal Link Privacy'}
              </h2>
              <p className="text-xs sm:text-sm text-[#796670] leading-relaxed">
                {lang === 'fr'
                  ? 'Chaque invitation repose sur un jeton cryptographique aléatoire unique. Ce lien constitue un secret de possession : toute personne à qui vous transférez votre lien personnel pourrait consulter votre invitation. Un code d’accès séparé peut être activé sur demande.'
                  : 'Each invitation uses a unique cryptographic token. This link acts as a possession secret: anyone with whom you share your personal link could view your invitation. A separate access PIN can be enabled upon request.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] space-y-2">
              <EyeOff className="w-5 h-5 text-[#A93665]" />
              <h2 className="font-serif-title text-xl font-semibold text-[#30232B]">
                {lang === 'fr' ? '3. Zéro pistage publicitaire' : '3. Zero Advertising Tracking'}
              </h2>
              <p className="text-xs sm:text-sm text-[#796670] leading-relaxed">
                {lang === 'fr'
                  ? 'Aucun traceur publicitaire, aucune reconnaissance faciale et aucune liste publique des invités ne sont utilisés. Les pages d’invitation comportent des directives noindex/nofollow et les photos téléversées voient leurs coordonnées GPS retirées automatiquement.'
                  : 'No advertising trackers, facial recognition, or public guest lists are used. Invitation pages enforce noindex/nofollow headers, and uploaded photos automatically have their GPS coordinates stripped.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] space-y-2">
              <Trash2 className="w-5 h-5 text-[#A93665]" />
              <h2 className="font-serif-title text-xl font-semibold text-[#30232B]">
                {lang === 'fr' ? '4. Droit de retrait et conservation' : '4. Deletion & Retention'}
              </h2>
              <p className="text-xs sm:text-sm text-[#796670] leading-relaxed">
                {lang === 'fr'
                  ? 'Les données sont conservées uniquement pour la préparation du mariage du 1er décembre 2026 et le partage de l’album souvenir familial, puis supprimées dans les 6 mois suivant la célébration. Vous pouvez demander la modification ou la suppression immédiate de vos informations auprès des mariés.'
                  : 'Data is retained solely for preparing the December 1, 2026 wedding and sharing the family memory album, then deleted within 6 months after the celebration. You may request immediate modification or deletion from the couple at any time.'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EEDDE5]">
            <Link
              to="/"
              className="inline-flex items-center px-5 py-2.5 rounded-full bg-[#A93665] text-white text-xs sm:text-sm font-medium hover:bg-[#762747] transition-colors"
            >
              {t.errors.backToPublic}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8FB] text-[#30232B]">
      <HeaderBubble navItems={[{ label: t.nav.home, href: '/' }]} />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white border border-[#EEDDE5] rounded-3xl p-8 sm:p-12 text-center">
          <Clock className="w-8 h-8 text-[#A93665] mx-auto" />
          <h1 className="font-serif-title text-3xl font-semibold text-[#30232B] mt-4">
            {t.errors.pageNotFoundTitle}
          </h1>
          <p className="text-sm text-[#796670] mt-2">
            {t.errors.pageNotFoundBody}
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center px-6 py-3 rounded-full bg-[#A93665] hover:bg-[#762747] text-white text-sm font-medium transition-colors"
          >
            {t.errors.backToPublic}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};
