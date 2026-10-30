import React, { useState } from 'react';
import { X, Eye } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.tsx';

interface MomentCard {
  id: string;
  titleFr: string;
  titleEn: string;
  subtitleFr: string;
  subtitleEn: string;
  categoryFr: string;
  categoryEn: string;
  imageSrc?: string;
  illustrationType?: 'peonies' | 'arch' | 'candles';
}

const MOMENTS_ITEMS: MomentCard[] = [
  {
    id: 'm-portrait',
    titleFr: 'Tendresse & Promesse',
    titleEn: 'Tenderness & Promise',
    subtitleFr: 'Portrait officiel de Joseph & Marie dans une atmosphère romantique.',
    subtitleEn: 'Official portrait of Joseph & Marie in a romantic atmosphere.',
    categoryFr: 'Les Mariés',
    categoryEn: 'The Couple',
    imageSrc: '/assets/aistudio/Portrait_de_mariage_romantique_et__l_gant_0c88a360.png',
  },
  {
    id: 'm-rings-1',
    titleFr: 'L’Éclat de l’Engagement',
    titleEn: 'The Radiance of Commitment',
    subtitleFr: 'Deux alliances unies pour sceller le mardi 1er décembre 2026.',
    subtitleEn: 'Two wedding bands united to seal Tuesday, December 1, 2026.',
    categoryFr: 'Alliances',
    categoryEn: 'Wedding Bands',
    imageSrc: '/assets/aistudio/Alliance_dor_e_de_Joseph_et_Marie_e0fc02ff.png',
  },
  {
    id: 'm-floral-peonies',
    titleFr: 'Bouquet Pivoines & Roses Blanches',
    titleEn: 'Peonies & White Roses Bouquet',
    subtitleFr: 'Inspiration florale Rose poudré & Blanc pur pour le cortège et la cérémonie.',
    subtitleEn: 'Powder Pink & Pure White floral inspiration for the ceremony.',
    categoryFr: 'Art Floral',
    categoryEn: 'Floral Art',
    illustrationType: 'peonies',
  },
  {
    id: 'm-floral-arch',
    titleFr: 'Arche Nuptiale & Allée de Pétales',
    titleEn: 'Bridal Arch & Petal Aisle',
    subtitleFr: 'Scénographie romantique et contemporaine pour la bénédiction nuptiale.',
    subtitleEn: 'Romantic and contemporary floral arch for the nuptial blessing.',
    categoryFr: 'Scénographie',
    categoryEn: 'Scenography',
    illustrationType: 'arch',
  },
  {
    id: 'm-rings-2',
    titleFr: 'Lumière & Éternité',
    titleEn: 'Light & Eternity',
    subtitleFr: 'Symbole de fidélité, d’amour et de partage entourés de nos proches.',
    subtitleEn: 'Symbol of fidelity, love, and sharing surrounded by loved ones.',
    categoryFr: 'Symbole',
    categoryEn: 'Symbol',
    imageSrc: '/assets/aistudio/Alliance_dor_es_entrelac_es_lumineuses_41789553.png',
  },
  {
    id: 'm-floral-candles',
    titleFr: 'Table d’Honneur Rose & Blanc',
    titleEn: 'Pink & White Head Table',
    subtitleFr: 'Harmonie des bougies, fleurs fraîches et éclats cristallins pour la grande soirée.',
    subtitleEn: 'Harmony of candles, fresh blooms, and crystal accents for the grand soirée.',
    categoryFr: 'Grande Soirée',
    categoryEn: 'Grand Soirée',
    illustrationType: 'candles',
  },
];

const FloralArtCanvas: React.FC<{ type: 'peonies' | 'arch' | 'candles' }> = ({ type }) => {
  if (type === 'peonies') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#FFF8FB] via-[#F6D6E2] to-[#EBAFC5] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <svg viewBox="0 0 320 240" className="w-full h-full max-h-56 drop-shadow-sm">
          <defs>
            <radialGradient id="peonyPink" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#A93665" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#EBAFC5" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFF8FB" stopOpacity="0.95" />
            </radialGradient>
            <radialGradient id="roseWhite" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F6D6E2" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#FFF8FB" stopOpacity="1" />
            </radialGradient>
          </defs>
          {/* Botanical leaves */}
          <path d="M90 155 Q50 120 75 80 Q115 100 90 155 Z" fill="#762747" opacity="0.18" />
          <path d="M230 155 Q270 120 245 80 Q205 100 230 155 Z" fill="#762747" opacity="0.18" />
          <path d="M160 185 Q160 220 145 235 M160 185 Q170 220 175 235" stroke="#762747" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
          {/* Left White Garden Rose */}
          <g transform="translate(115, 125)">
            <circle r="38" fill="url(#roseWhite)" stroke="#EEDDE5" strokeWidth="1.5" />
            <circle r="26" fill="none" stroke="#EBAFC5" strokeWidth="1.2" strokeDasharray="12 6" />
            <circle r="14" fill="#FFF8FB" stroke="#EBAFC5" strokeWidth="1.2" />
            <circle r="5" fill="#A93665" opacity="0.5" />
          </g>
          {/* Right White Garden Rose */}
          <g transform="translate(205, 130)">
            <circle r="35" fill="url(#roseWhite)" stroke="#EEDDE5" strokeWidth="1.5" />
            <circle r="22" fill="none" stroke="#EBAFC5" strokeWidth="1.2" strokeDasharray="10 5" />
            <circle r="11" fill="#FFF8FB" stroke="#EBAFC5" strokeWidth="1.2" />
          </g>
          {/* Center Blush Pink Peony */}
          <g transform="translate(160, 105)">
            <circle r="48" fill="url(#peonyPink)" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M-28 -10 Q0 -38 28 -10 Q38 18 0 32 Q-38 18 -28 -10 Z" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.85" />
            <path d="M-18 -6 Q0 -24 18 -6 Q24 12 0 20 Q-24 12 -18 -6 Z" fill="none" stroke="#FFF8FB" strokeWidth="1.5" />
            <circle r="8" fill="#762747" opacity="0.7" />
            <circle cx="-3" cy="-2" r="2" fill="#FFFFFF" />
            <circle cx="3" cy="2" r="2" fill="#FFFFFF" />
          </g>
        </svg>
      </div>
    );
  }

  if (type === 'arch') {
    return (
      <div className="w-full h-full bg-gradient-to-b from-[#FFFFFF] via-[#FFF8FB] to-[#F6D6E2] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <svg viewBox="0 0 320 240" className="w-full h-full max-h-56">
          {/* Floral Arch Frame */}
          <path
            d="M85 220 L85 110 A75 75 0 0 1 235 110 L235 220"
            fill="none"
            stroke="#EBAFC5"
            strokeWidth="3"
          />
          <path
            d="M95 220 L95 112 A65 65 0 0 1 225 112 L225 220"
            fill="none"
            stroke="#A93665"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          {/* Floral clusters on the arch */}
          {[
            { cx: 95, cy: 95, r: 16, fill: '#F6D6E2' },
            { cx: 112, cy: 65, r: 20, fill: '#EBAFC5' },
            { cx: 138, cy: 45, r: 18, fill: '#FFFFFF' },
            { cx: 165, cy: 40, r: 22, fill: '#F6D6E2' },
            { cx: 195, cy: 50, r: 17, fill: '#FFFFFF' },
            { cx: 220, cy: 75, r: 19, fill: '#EBAFC5' },
            { cx: 232, cy: 105, r: 15, fill: '#F6D6E2' },
          ].map((b, idx) => (
            <g key={idx}>
              <circle cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} stroke="#A93665" strokeWidth="1" strokeOpacity="0.35" />
              <circle cx={b.cx} cy={b.cy} r={b.r * 0.4} fill="#A93665" opacity="0.45" />
            </g>
          ))}
          {/* Center Monogram inside the floral arch */}
          <text
            x="160"
            y="142"
            textAnchor="middle"
            className="font-serif-title"
            fill="#762747"
            fontSize="30"
            fontWeight="600"
          >
            J &amp; M
          </text>
          <text
            x="160"
            y="165"
            textAnchor="middle"
            fill="#A93665"
            fontSize="10"
            letterSpacing="3"
          >
            01 · 12 · 2026
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-tr from-[#30232B] via-[#762747] to-[#A93665] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <svg viewBox="0 0 320 240" className="w-full h-full max-h-56">
        {/* Soft glowing bokeh circles */}
        <circle cx="70" cy="60" r="24" fill="#F6D6E2" opacity="0.15" />
        <circle cx="250" cy="55" r="32" fill="#FFF8FB" opacity="0.12" />
        <circle cx="190" cy="40" r="16" fill="#EBAFC5" opacity="0.2" />
        {/* Taper candles */}
        <rect x="112" y="95" width="10" height="85" rx="3" fill="#FFF8FB" />
        <path d="M117 75 Q123 85 117 92 Q111 85 117 75 Z" fill="#F6D6E2" />
        <circle cx="117" cy="84" r="12" fill="#F6D6E2" opacity="0.35" />

        <rect x="155" y="75" width="10" height="105" rx="3" fill="#FFFFFF" />
        <path d="M160 55 Q166 65 160 72 Q154 65 160 55 Z" fill="#FFF8FB" />
        <circle cx="160" cy="64" r="15" fill="#FFF8FB" opacity="0.4" />

        <rect x="198" y="102" width="10" height="78" rx="3" fill="#FFF8FB" />
        <path d="M203 82 Q209 92 203 99 Q197 92 203 82 Z" fill="#F6D6E2" />
        <circle cx="203" cy="91" r="12" fill="#F6D6E2" opacity="0.35" />

        {/* Floral Garland at the base */}
        <path d="M60 185 Q160 165 260 185" stroke="#EBAFC5" strokeWidth="3" fill="none" />
        <circle cx="115" cy="180" r="16" fill="#F6D6E2" />
        <circle cx="160" cy="176" r="20" fill="#FFFFFF" />
        <circle cx="205" cy="180" r="16" fill="#EBAFC5" />
      </svg>
    </div>
  );
};

export const NosMomentsGallery: React.FC = () => {
  const { lang } = useI18n();
  const [selectedItem, setSelectedItem] = useState<MomentCard | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'couple' | 'floral'>('all');

  const filteredItems = MOMENTS_ITEMS.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'couple') return Boolean(item.imageSrc);
    return Boolean(item.illustrationType);
  });

  return (
    <section id="nos-moments" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <div className="bg-white border border-[#EEDDE5] rounded-3xl p-5 sm:p-10 md:p-12 shadow-[0_12px_40px_rgb(118,39,71,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#A93665] tracking-wider uppercase">
              <span>
                {lang === 'fr'
                  ? '02. Galerie Romantique & Florale'
                  : '02. Romantic & Floral Gallery'}
              </span>
            </div>
            <h2
              className="font-serif-title text-2xl sm:text-5xl font-semibold text-[#30232B] mt-2"
              style={{ textWrap: 'balance' }}
            >
              {lang === 'fr' ? 'Nos Moments' : 'Our Moments'}
            </h2>
            <p className="text-xs sm:text-base text-[#796670] mt-2 max-w-2xl leading-relaxed">
              {lang === 'fr'
                ? 'Un aperçu de notre univers Rose & Blanc : portraits des mariés, alliances et inspirations florales pour célébrer notre union.'
                : 'A glimpse into our Pink & White world: couple portraits, wedding bands, and floral inspirations to celebrate our union.'}
            </p>
          </div>

          {/* Interactive Filter Controls */}
          <div
            role="group"
            aria-label="Filtrer la galerie Nos Moments"
            className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1.5 bg-[#FFF8FB] border border-[#EEDDE5] rounded-2xl sm:rounded-full self-start w-full sm:w-auto"
          >
            {[
              { id: 'all', labelFr: 'Tout voir', labelEn: 'All Moments' },
              { id: 'couple', labelFr: 'Portraits & Alliances', labelEn: 'Couple & Rings' },
              { id: 'floral', labelFr: 'Art Floral & Décor', labelEn: 'Floral & Decor' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as 'all' | 'couple' | 'floral')}
                className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl sm:rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap text-center ${
                  activeFilter === tab.id
                    ? 'bg-[#A93665] text-white'
                    : 'text-[#796670] hover:text-[#30232B]'
                }`}
              >
                {lang === 'fr' ? tab.labelFr : tab.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mt-8 sm:mt-10">
          {filteredItems.map((item) => {
            const title = lang === 'fr' ? item.titleFr : item.titleEn;
            const subtitle = lang === 'fr' ? item.subtitleFr : item.subtitleEn;
            const category = lang === 'fr' ? item.categoryFr : item.categoryEn;

            return (
              <article
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group cursor-pointer rounded-2xl overflow-hidden border border-[#EEDDE5] bg-[#FFF8FB] flex flex-col justify-between transition-all hover:shadow-[0_14px_35px_rgba(118,39,71,0.09)]"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-[#F6D6E2]/25">
                  {item.imageSrc ? (
                    <img
                      src={item.imageSrc}
                      alt={title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full group-hover:scale-105 transition-transform duration-500">
                      <FloralArtCanvas type={item.illustrationType || 'peonies'} />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3.5 py-2 rounded-full bg-white/95 text-[#30232B] text-xs font-medium flex items-center gap-1.5 shadow-md">
                      <Eye className="w-3.5 h-3.5 text-[#A93665]" />
                      <span>{lang === 'fr' ? 'Agrandir' : 'View'}</span>
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-[#A93665] font-medium">
                    <span>{category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Rose &amp; Blanc</span>
                  </div>
                  <h3 className="font-serif-title text-2xl font-semibold text-[#30232B] mt-1 group-hover:text-[#A93665] transition-colors">
                    {title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#796670] mt-1 leading-relaxed">
                    {subtitle}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedItem(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full bg-white border border-[#EEDDE5] rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="relative aspect-4/3 bg-[#FFF8FB]">
              {selectedItem.imageSrc ? (
                <img
                  src={selectedItem.imageSrc}
                  alt={lang === 'fr' ? selectedItem.titleFr : selectedItem.titleEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <FloralArtCanvas type={selectedItem.illustrationType || 'peonies'} />
              )}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Fermer"
                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/65 text-white hover:bg-black transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs font-medium text-[#A93665]">
                {lang === 'fr' ? selectedItem.categoryFr : selectedItem.categoryEn} · Thème Rose &amp; Blanc
              </p>
              <h3 className="font-serif-title text-2xl sm:text-3xl font-semibold text-[#30232B] mt-1">
                {lang === 'fr' ? selectedItem.titleFr : selectedItem.titleEn}
              </h3>
              <p className="text-sm text-[#796670] mt-2">
                {lang === 'fr' ? selectedItem.subtitleFr : selectedItem.subtitleEn}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
