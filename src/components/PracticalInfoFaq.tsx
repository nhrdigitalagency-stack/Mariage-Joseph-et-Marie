import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shirt,
  Car,
  Building2,
  Compass,
  ChevronDown,
  MapPin,
  Clock,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.tsx';

type FaqCategory = 'all' | 'dresscode' | 'transport' | 'lodging' | 'organization';

interface FaqItem {
  id: string;
  category: Exclude<FaqCategory, 'all'>;
  questionFr: string;
  questionEn: string;
  answerFr: string;
  answerEn: string;
  highlightFr?: string;
  highlightEn?: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-dress-1',
    category: 'dresscode',
    questionFr: 'Quel est le dress code exact selon les étapes de la journée ?',
    questionEn: 'What is the exact dress code for each part of the day?',
    answerFr:
      'Le thème général du mariage est Rose & Blanc. Pour la cérémonie civile en matinée (11h30 à la Mairie de Yaoundé 1) et la cérémonie religieuse (14h30), une tenue de ville élégante et soignée est recommandée. À partir de 20h00 pour la grande soirée à Simbock, la tenue de soirée formelle est exigée pour tous les invités (robes de soirée ou ensembles habillés pour les dames, costume ou smoking avec touche rose/blanche pour les messieurs).',
    answerEn:
      'The overall wedding theme is Pink & White. For the morning civil ceremony (11:30 AM at Yaoundé 1 City Hall) and religious ceremony (2:30 PM), smart city attire is recommended. Starting at 8:00 PM for the grand soirée in Simbock, formal evening wear is required for all guests.',
    highlightFr: 'Thème Rose & Blanc · Tenue de ville en journée · Tenue de soirée dès 20h00',
    highlightEn: 'Pink & White Theme · Smart attire by day · Formal evening wear from 8:00 PM',
  },
  {
    id: 'faq-dress-2',
    category: 'dresscode',
    questionFr: 'Quelles nuances de rose et de blanc sont conseillées ?',
    questionEn: 'Which shades of pink and white are recommended?',
    answerFr:
      'Vous pouvez privilégier le rose poudré, le vieux rose, le blanc cassé, le blanc nacré ou des costumes sombres/beiges réhaussés d’une chemise blanche et d’accessoires roses (pochette, cravate, nœud papillon, foulard ou fleurs).',
    answerEn:
      'We recommend powder pink, dusty rose, off-white, pearl white, or classic tailored suits paired with a crisp white shirt and pink accessories (pocket square, tie, bow tie, or floral lapel pin).',
  },
  {
    id: 'faq-transport-1',
    category: 'transport',
    questionFr: 'Comment organiser ses déplacements entre la Mairie de Yaoundé 1 et Simbock ?',
    questionEn: 'How should we plan travel between Yaoundé 1 City Hall and Simbock?',
    answerFr:
      'La cérémonie civile a lieu à 11h30 à la Mairie de Yaoundé 1 (centre/nord de Yaoundé), tandis que les célébrations de l’après-midi et la soirée sont regroupées dans le secteur de Simbock (non loin du rond-point Damas) afin de limiter les déplacements. Nous vous conseillons de prévoir 35 à 50 minutes de trajet entre le centre-ville et Simbock en milieu de journée, et de privilégier le covoiturage familial ou un chauffeur/VTC (Yango, taxi réservé) pour la soirée.',
    answerEn:
      'The civil ceremony takes place at 11:30 AM at Yaoundé 1 City Hall, while the afternoon and evening celebrations are grouped in the Simbock area (near Rond-Point Damas) to minimize travel. Please allow 35 to 50 minutes between downtown Yaoundé and Simbock, and consider family carpooling or a dedicated driver/ride-hailing service for the evening.',
    highlightFr: 'Regroupement des lieux à Simbock dès l’après-midi pour éviter les longs trajets',
    highlightEn: 'Afternoon & evening venues grouped in Simbock to avoid multiple trips',
  },
  {
    id: 'faq-transport-2',
    category: 'transport',
    questionFr: 'Des parkings sont-ils prévus sur les lieux de cérémonie et de réception ?',
    questionEn: 'Is parking available at the ceremony and reception venues?',
    answerFr:
      'Oui. La Mairie de Yaoundé 1 ainsi que la paroisse et l’espace de réception à Simbock disposent d’aires de stationnement dédiées aux invités. Pour la grande soirée dès 20h00 à Simbock, un service d’orientation et de surveillance du parking sera présent pour faciliter votre arrivée et votre départ jusqu’à l’aube.',
    answerEn:
      'Yes. Yaoundé 1 City Hall as well as the parish and reception venue in Simbock provide dedicated guest parking areas. For the evening reception starting at 8:00 PM in Simbock, parking attendants and security will be on site until dawn.',
  },
  {
    id: 'faq-lodging-1',
    category: 'lodging',
    questionFr: 'Quels hébergements conseillez-vous à Simbock ou à proximité ?',
    questionEn: 'What accommodations do you recommend in or near Simbock?',
    answerFr:
      'Pour les invités venant de l’extérieur de Yaoundé ou souhaitant loger tout près de la réception du soir, nous recommandons les résidences meublées sécurisées et hôtels situés à Simbock, Mendong, Damas et Odza (à 5–12 minutes du lieu de soirée). Pour ceux qui préfèrent résider près de la Mairie de Yaoundé 1, les hôtels des quartiers Bastos et Centre-Ville se trouvent à 10–15 minutes de la mairie.',
    answerEn:
      'For guests traveling from outside Yaoundé or wishing to stay close to the evening venue, we recommend secure furnished apartments and hotels in Simbock, Mendong, Damas, and Odza (5–12 minutes from the reception). Guests preferring to stay near Yaoundé 1 City Hall can opt for hotels in Bastos or Downtown Yaoundé.',
    highlightFr: 'Secteurs proches soirée : Simbock, Damas, Mendong · Secteurs proches Mairie : Centre-Ville, Bastos',
    highlightEn: 'Near evening venue: Simbock, Damas, Mendong · Near City Hall: Downtown, Bastos',
  },
  {
    id: 'faq-org-1',
    category: 'organization',
    questionFr: 'Comment retrouver mon programme exact et confirmer ma présence (RSVP) ?',
    questionEn: 'How do I view my exact schedule and confirm my attendance (RSVP)?',
    answerFr:
      'Chaque invité ou famille a reçu un lien d’invitation personnel unique (par WhatsApp ou message privé). En cliquant sur ce lien, vous accédez automatiquement aux horaires précis des étapes auxquelles vous êtes convié(e), aux itinéraires Google Maps, au téléchargement de votre agenda (.ics) et au formulaire de confirmation de présence.',
    answerEn:
      'Each guest or family received a unique personal invitation link (via WhatsApp or private message). Opening your personal link displays the exact schedule for the moments you are invited to, Google Maps directions, calendar export (.ics), and your RSVP form.',
  },
  {
    id: 'faq-org-2',
    category: 'organization',
    questionFr: 'Comment fonctionne le partage de photos par les invités ?',
    questionEn: 'How does guest photo sharing work?',
    answerFr:
      'Depuis votre lien d’invitation personnel, vous pouvez importer vos photos de la fête dans la rubrique « Importer des photos ». Par respect pour l’intimité de chacun, les photos que vous publiez sont strictement privées : elles sont visibles uniquement par les mariés (propriétaires de la plateforme) et par vous-même.',
    answerEn:
      'From your personal invitation link, you can upload your celebration photos under the "Upload Photos" tab. To protect everyone’s privacy, uploaded photos are strictly visible only to the couple (platform owners) and to the guest who uploaded them.',
  },
];

export const PracticalInfoFaq: React.FC = () => {
  const { lang } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>('all');
  const [openFaqId, setOpenFaqId] = useState<string>('faq-dress-1');

  const categories: { id: FaqCategory; labelFr: string; labelEn: string }[] = [
    { id: 'all', labelFr: 'Toutes les questions', labelEn: 'All Questions' },
    { id: 'dresscode', labelFr: 'Dress Code & Thème', labelEn: 'Dress Code & Theme' },
    { id: 'transport', labelFr: 'Trajet & Parkings', labelEn: 'Travel & Parking' },
    { id: 'lodging', labelFr: 'Hébergements (Simbock)', labelEn: 'Lodging (Simbock)' },
    { id: 'organization', labelFr: 'Invitations & Photos', labelEn: 'Invitations & Photos' },
  ];

  const practicalCards = [
    {
      icon: Shirt,
      badgeFr: 'Thème Rose & Blanc',
      badgeEn: 'Pink & White Theme',
      titleFr: 'Dress Code & Harmonie',
      titleEn: 'Dress Code & Harmony',
      pointsFr: [
        '11h30 (Mairie de Yaoundé 1) : Tenue de ville chic et élégante.',
        '14h30 (Cérémonie religieuse) : Tenue de cérémonie harmonisée.',
        'Dès 20h00 (Grande soirée à Simbock) : Tenue de soirée exigée pour tous.',
      ],
      pointsEn: [
        '11:30 AM (Yaoundé 1 City Hall): Smart & elegant city attire.',
        '2:30 PM (Religious ceremony): Harmonious formal ceremony attire.',
        'From 8:00 PM (Grand soirée in Simbock): Formal evening attire required.',
      ],
      swatches: [
        { hex: '#FFFFFF', labelFr: 'Blanc pur', labelEn: 'Pure White' },
        { hex: '#FFF8FB', labelFr: 'Blanc nacré', labelEn: 'Pearl White' },
        { hex: '#F6D6E2', labelFr: 'Rose poudré', labelEn: 'Powder Pink' },
        { hex: '#EBAFC5', labelFr: 'Rose tendre', labelEn: 'Soft Rose' },
        { hex: '#A93665', labelFr: 'Rose soutenu', labelEn: 'Deep Rose' },
      ],
    },
    {
      icon: Car,
      badgeFr: 'Stationnement & Sécurité',
      badgeEn: 'Parking & Security',
      titleFr: 'Parkings & Accès Véhicules',
      titleEn: 'Parking & Vehicle Access',
      pointsFr: [
        'Stationnement disponible à la Mairie de Yaoundé 1 pour la matinée.',
        'Parking dédié et sécurisé sur le site de Simbock (vin d’honneur & soirée).',
        'Possibilité de dépose-minute devant l’entrée principale en cas de pluie ou tenue de soirée.',
      ],
      pointsEn: [
        'Parking available at Yaoundé 1 City Hall for the morning ceremony.',
        'Dedicated, secure parking at the Simbock venue (cocktail & evening).',
        'Drop-off zone right at the main entrance for evening attire convenience.',
      ],
    },
    {
      icon: Compass,
      badgeFr: 'Yaoundé 1 → Simbock',
      badgeEn: 'Yaoundé 1 → Simbock',
      titleFr: 'Conseils pour le Trajet',
      titleEn: 'Travel & Route Tips',
      pointsFr: [
        'Réception et soirée regroupées à Simbock (proche Rond-Point Damas) pour éviter les déplacements multiples.',
        'Prévoir 35 à 50 min entre la Mairie de Yaoundé 1 et le quartier Simbock selon la circulation.',
        'Privilégiez le covoiturage ou un VTC / chauffeur dédié pour profiter sereinement de la soirée jusqu’à l’aube.',
      ],
      pointsEn: [
        'Afternoon & evening events grouped in Simbock (near Rond-Point Damas) to avoid multiple trips.',
        'Allow 35 to 50 mins between Yaoundé 1 City Hall and Simbock depending on traffic.',
        'Consider carpooling or a dedicated driver/ride-hail to enjoy the party until dawn.',
      ],
    },
    {
      icon: Building2,
      badgeFr: 'Séjour à Yaoundé',
      badgeEn: 'Staying in Yaoundé',
      titleFr: 'Hébergements à Simbock & Alentours',
      titleEn: 'Accommodations in Simbock & Nearby',
      pointsFr: [
        'Proximité immédiate soirée (5–10 min) : Résidences meublées et hôtels à Simbock, Damas et Mendong.',
        'Option confort & calme (15 min) : Appartements meublés sécurisés secteur Odza / Nsam.',
        'Proximité Mairie Yaoundé 1 : Hôtels du Centre-Ville et du quartier Bastos.',
      ],
      pointsEn: [
        'Closest to evening venue (5–10 min): Furnished residences & hotels in Simbock, Damas, and Mendong.',
        'Quiet residential option (15 min): Secure serviced apartments in Odza / Nsam.',
        'Closest to Yaoundé 1 City Hall: Hotels in Downtown Yaoundé and Bastos.',
      ],
    },
  ];

  const filteredFaqs =
    selectedCategory === 'all'
      ? FAQ_ITEMS
      : FAQ_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <section id="infos-pratiques" className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <p className="text-xs font-medium text-[#A93665] tracking-widest uppercase">
          {lang === 'fr' ? '03. Préparer votre venue' : '03. Plan Your Visit'}
        </p>
        <h2 className="text-3xl sm:text-5xl font-semibold text-[#30232B] mt-2">
          {lang === 'fr' ? 'Informations Pratiques & FAQ' : 'Practical Information & FAQ'}
        </h2>
        <p className="text-sm sm:text-base text-[#796670] mt-3 leading-relaxed">
          {lang === 'fr'
            ? 'Tout ce qu’il faut savoir sur le thème Rose & Blanc, le stationnement, les conseils de trajet entre la Mairie de Yaoundé 1 et Simbock, ainsi que les pistes d’hébergement.'
            : 'Everything you need to know about the Pink & White dress code, parking, travel tips between Yaoundé 1 City Hall and Simbock, and nearby accommodations.'}
        </p>
      </div>

      {/* 4 Practical Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
        {practicalCards.map((card, index) => {
          const IconComponent = card.icon;
          const points = lang === 'fr' ? card.pointsFr : card.pointsEn;
          return (
            <motion.div
              key={card.titleFr}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_rgb(118,39,71,0.04)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] text-[#A93665] flex items-center justify-center shrink-0">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="px-3.5 py-1 rounded-full bg-[#FFF8FB] border border-[#EEDDE5] text-xs font-medium text-[#762747]">
                    {lang === 'fr' ? card.badgeFr : card.badgeEn}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-semibold text-[#30232B]">
                  {lang === 'fr' ? card.titleFr : card.titleEn}
                </h3>

                <ul className="mt-4 space-y-2.5">
                  {points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#796670] leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-[#A93665] shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {card.swatches && (
                <div className="mt-6 pt-4 border-t border-[#EEDDE5]">
                  <p className="text-[11px] font-medium text-[#796670] uppercase tracking-wider mb-2.5">
                    {lang === 'fr' ? 'Palette conseillée :' : 'Recommended palette:'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {card.swatches.map((sw) => (
                      <div key={sw.hex} className="flex items-center gap-1.5">
                        <span
                          className="w-5 h-5 rounded-full border border-[#EEDDE5] shadow-2xs shrink-0"
                          style={{ backgroundColor: sw.hex }}
                        />
                        <span className="text-xs text-[#30232B]">
                          {lang === 'fr' ? sw.labelFr : sw.labelEn}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Interactive FAQ Block */}
      <div className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-10 shadow-[0_12px_40px_rgb(118,39,71,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#EEDDE5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] text-[#A93665] flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold text-[#30232B]">
                {lang === 'fr' ? 'Questions Fréquentes (FAQ)' : 'Frequently Asked Questions (FAQ)'}
              </h3>
              <p className="text-xs sm:text-sm text-[#796670]">
                {lang === 'fr'
                  ? 'Cliquez sur une thématique ou une question pour afficher les détails.'
                  : 'Select a category or click a question to view full details.'}
              </p>
            </div>
          </div>

          {/* Category Filter Buttons */}
          <div
            role="group"
            aria-label={lang === 'fr' ? 'Filtrer les questions fréquentes' : 'Filter FAQ'}
            className="flex flex-wrap items-center gap-1.5"
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#A93665] text-white shadow-xs'
                      : 'bg-[#FFF8FB] text-[#796670] hover:text-[#30232B] border border-[#EEDDE5]'
                  }`}
                >
                  {lang === 'fr' ? cat.labelFr : cat.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Accordion Items */}
        <div className="divide-y divide-[#EEDDE5] mt-2">
          {filteredFaqs.map((item) => {
            const isOpen = openFaqId === item.id;
            const question = lang === 'fr' ? item.questionFr : item.questionEn;
            const answer = lang === 'fr' ? item.answerFr : item.answerEn;
            const highlight = lang === 'fr' ? item.highlightFr : item.highlightEn;

            return (
              <div key={item.id} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? '' : item.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 text-left py-2 cursor-pointer group"
                >
                  <span className="text-sm sm:text-base font-semibold text-[#30232B] group-hover:text-[#A93665] transition-colors">
                    {question}
                  </span>
                  <span
                    className={`w-8 h-8 rounded-full border border-[#EEDDE5] bg-[#FFF8FB] flex items-center justify-center text-[#A93665] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-[#F6D6E2]/40' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 pb-3 pr-4 sm:pr-10 space-y-3">
                        <p className="text-xs sm:text-sm text-[#796670] leading-relaxed">
                          {answer}
                        </p>
                        {highlight && (
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-xs font-medium text-[#762747]">
                            <Clock className="w-3.5 h-3.5 text-[#A93665] shrink-0" />
                            <span>{highlight}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Bottom Geography & Schedule Summary Banner */}
        <div className="mt-6 pt-6 border-t border-[#EEDDE5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFF8FB] p-5 rounded-2xl border">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#A93665] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-[#30232B]">
                {lang === 'fr'
                  ? 'Repères géographiques à Yaoundé (Mardi 1er décembre 2026)'
                  : 'Key Landmarks in Yaoundé (Tuesday, December 1, 2026)'}
              </p>
              <p className="text-xs text-[#796670] mt-0.5">
                {lang === 'fr'
                  ? 'Matinée (11h30) : Mairie de Yaoundé 1 · Après-midi (14h30) & Soirée (dès 20h00) : Quartier Simbock (proche Rond-Point Damas).'
                  : 'Morning (11:30 AM): Yaoundé 1 City Hall · Afternoon (2:30 PM) & Evening (from 8:00 PM): Simbock district (near Rond-Point Damas).'}
              </p>
            </div>
          </div>
          <a
            href="#acces-prive"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('acces-prive')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 rounded-full bg-[#A93665] hover:bg-[#762747] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {lang === 'fr' ? 'Ouvrir mon invitation' : 'Open My Invitation'}
          </a>
        </div>
      </div>
    </section>
  );
};
