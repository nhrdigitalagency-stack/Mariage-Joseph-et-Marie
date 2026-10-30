import {
  AdminRole,
  AuditLogEntry,
  AuthorizedGuestEvent,
  EventId,
  GuestInvitationView,
  GuestWishMessage,
  InvitationPerson,
  InvitationRecord,
  InvitationType,
  PersonEventResponse,
  RsvpGlobalStatus,
  SharedMemoryPhoto,
  WeddingEventConfig,
} from '../types/wedding.ts';

interface ClientDatabaseState {
  events: WeddingEventConfig[];
  invitations: InvitationRecord[];
  wishes: GuestWishMessage[];
  photos: SharedMemoryPhoto[];
  auditLogs: AuditLogEntry[];
}

const STORAGE_KEY = 'jm_wedding_db_state_v2';
const SESSION_STORAGE_KEY = 'jm_admin_sessions_v2';

interface ClientAdminSession {
  token: string;
  role: AdminRole;
  label: string;
  expiresAt: number;
}

function simpleHashToken(rawToken: string): string {
  const str = rawToken.trim();
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function generateClientToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

function sanitizeCsvCellClient(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str}"`;
}

function getDefaultClientEvents(): WeddingEventConfig[] {
  const now = '2026-10-28T10:00:00.000Z';
  return [
    {
      id: 'civil',
      sortOrder: 1,
      titleFr: 'Le mariage civil',
      titleEn: 'The Civil Ceremony',
      eventDate: '2026-12-01',
      startTime: '11:30',
      timeLabelFr: '11 h 30',
      timeLabelEn: '11:30 AM',
      endLabelFr: null,
      endLabelEn: null,
      venueNameFr: 'Mairie de Yaoundé 1',
      venueNameEn: 'Yaoundé 1 City Hall (Mairie)',
      addressFr: 'Mairie de Yaoundé 1, Centre administratif — Yaoundé',
      addressEn: 'Yaoundé 1 City Hall — Administrative Center, Yaoundé',
      venueStatusNoteFr: 'Cérémonie officielle suivie d’une séance photo et d’une légère collation.',
      venueStatusNoteEn: 'Official ceremony followed by photos and light refreshments.',
      isAddressConfirmed: true,
      isPrivateAddress: false,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Mairie+de+Yaounde+1+Cameroun',
      descriptionFr: 'Joseph et Marie officialiseront leur union lors de la cérémonie civile, entourés de leurs proches.',
      descriptionEn: 'Joseph and Marie will officialize their union during the civil ceremony, surrounded by their loved ones.',
      dressCodeFr: 'Tenue de ville élégante et soignée (Thème Rose & Blanc).',
      dressCodeEn: 'Elegant and smart city attire (Pink & White theme).',
      themeLabelFr: 'Rose & Blanc',
      themeLabelEn: 'Pink & White',
      notesFr: [
        'Photos avec les mariés après la cérémonie.',
        'Petite collation offerte aux invités présents à la mairie (à proximité de la mairie).',
      ],
      notesEn: [
        'Photos with the newlyweds after the ceremony.',
        'Light refreshments offered to guests attending City Hall.',
      ],
      updatedAt: now,
    },
    {
      id: 'church',
      sortOrder: 2,
      titleFr: 'La cérémonie religieuse',
      titleEn: 'The Religious Ceremony',
      eventDate: '2026-12-01',
      startTime: '14:30',
      timeLabelFr: '14 h 30',
      timeLabelEn: '2:30 PM',
      endLabelFr: null,
      endLabelEn: null,
      venueNameFr: 'Paroisse Saints-Pierre-et-Paul de Simbock',
      venueNameEn: 'Sts. Peter & Paul Parish, Simbock',
      addressFr: 'Quartier Simbock (repère cartographique RFCG+48R), Yaoundé',
      addressEn: 'Simbock District (map code RFCG+48R), Yaoundé',
      venueStatusNoteFr: 'Bénédiction nuptiale à 14h30.',
      venueStatusNoteEn: 'Nuptial blessing at 2:30 PM.',
      isAddressConfirmed: true,
      isPrivateAddress: false,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Paroisse+Saints+Pierre+et+Paul+Simbock+Yaounde',
      descriptionFr: 'Les mariés échangeront leurs vœux et recevront la bénédiction nuptiale au cours de la célébration religieuse.',
      descriptionEn: 'The couple will exchange their vows and receive the nuptial blessing during the religious celebration.',
      dressCodeFr: 'Tenue élégante et harmonisée dans l’esprit Rose & Blanc.',
      dressCodeEn: 'Elegant attire harmonized with the Pink & White theme.',
      themeLabelFr: 'Rose & Blanc',
      themeLabelEn: 'Pink & White',
      notesFr: ['Merci de prévoir une arrivée 15 à 20 minutes avant le début de la célébration.'],
      notesEn: ['Please plan to arrive 15 to 20 minutes before the ceremony begins.'],
      updatedAt: now,
    },
    {
      id: 'home_reception',
      sortOrder: 3,
      titleFr: 'Accueil familial au domicile des mariés',
      titleEn: 'Family Welcome at the Couple’s Home',
      eventDate: '2026-12-01',
      startTime: null,
      timeLabelFr: 'Après la cérémonie religieuse',
      timeLabelEn: 'Following the religious ceremony',
      endLabelFr: null,
      endLabelEn: null,
      venueNameFr: 'Domicile des mariés à Simbock',
      venueNameEn: 'Couple’s Residence in Simbock',
      addressFr: 'Quartier Simbock, Yaoundé (adresse privée communiquée aux invités conviés)',
      addressEn: 'Simbock District, Yaoundé (private address shared with invited guests)',
      venueStatusNoteFr: 'Moment convivial réservé au cercle familial et aux proches conviés.',
      venueStatusNoteEn: 'Warm gathering reserved for family and invited close friends.',
      isAddressConfirmed: false,
      isPrivateAddress: true,
      mapUrl: null,
      descriptionFr: 'Après la cérémonie religieuse, un temps d’accueil et de rafraîchissement est prévu au domicile des mariés à Simbock.',
      descriptionEn: 'Following the church ceremony, a welcome and refreshment gathering will be held at the couple’s residence in Simbock.',
      dressCodeFr: 'Tenue de cérémonie Rose & Blanc.',
      dressCodeEn: 'Pink & White ceremony attire.',
      themeLabelFr: 'Rose & Blanc',
      themeLabelEn: 'Pink & White',
      notesFr: ['Accès réservé aux invitations incluant cette étape.'],
      notesEn: ['Access reserved for invitations including this step.'],
      updatedAt: now,
    },
    {
      id: 'cocktail',
      sortOrder: 4,
      titleFr: 'Le vin d’honneur et les photos',
      titleEn: 'Cocktail Reception & Photos',
      eventDate: '2026-12-01',
      startTime: '17:00',
      timeLabelFr: '17 h 00 – 19 h 00',
      timeLabelEn: '5:00 PM – 7:00 PM',
      endLabelFr: '19 h 00',
      endLabelEn: '7:00 PM',
      venueNameFr: 'Les Jardins de Simbock',
      venueNameEn: 'Les Jardins de Simbock',
      addressFr: 'Quartier Simbock, non loin du Rond-Point Damas, Yaoundé',
      addressEn: 'Simbock District, near Rond-Point Damas, Yaoundé',
      venueStatusNoteFr: 'Espace vert aménagé pour le cocktail et les photos officielles.',
      venueStatusNoteEn: 'Garden venue for the cocktail reception and official photos.',
      isAddressConfirmed: true,
      isPrivateAddress: false,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Simbock+Rond+Point+Damas+Yaounde',
      descriptionFr: 'Un moment convivial sera consacré au vin d’honneur, aux échanges avec les invités et aux séances photos.',
      descriptionEn: 'A convivial moment dedicated to cocktails, mingling with guests, and photography sessions.',
      dressCodeFr: 'Chic et élégant dans le thème Rose & Blanc.',
      dressCodeEn: 'Chic and elegant in the Pink & White theme.',
      themeLabelFr: 'Rose & Blanc',
      themeLabelEn: 'Pink & White',
      notesFr: ['Séances photos par familles et groupes d’amis entre 17h00 et 19h00.'],
      notesEn: ['Photo sessions with families and friend groups between 5:00 PM and 7:00 PM.'],
      updatedAt: now,
    },
    {
      id: 'evening',
      sortOrder: 5,
      titleFr: 'La grande soirée de mariage',
      titleEn: 'The Grand Wedding Soirée',
      eventDate: '2026-12-01',
      startTime: '20:00',
      timeLabelFr: 'À partir de 20 h 00',
      timeLabelEn: 'Starting at 8:00 PM',
      endLabelFr: 'Jusqu’à l’aube',
      endLabelEn: 'Until dawn',
      venueNameFr: 'Les Jardins de Simbock / Salle de fête Simbock',
      venueNameEn: 'Les Jardins de Simbock / Simbock Reception Hall',
      addressFr: 'Quartier Simbock, proche Rond-Point Damas, Yaoundé',
      addressEn: 'Simbock District, near Rond-Point Damas, Yaoundé',
      venueStatusNoteFr: 'Dîner de gala et soirée dansante jusqu’à l’aube.',
      venueStatusNoteEn: 'Gala dinner and dancing until dawn.',
      isAddressConfirmed: true,
      isPrivateAddress: false,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Simbock+Yaounde',
      descriptionFr: 'À partir de 20h00, Joseph et Marie vous donnent rendez-vous pour la grande soirée de mariage : dîner, animations et célébration jusqu’à l’aube.',
      descriptionEn: 'Starting at 8:00 PM, Joseph and Marie welcome you to the grand wedding soirée: dinner, entertainment, and celebration until dawn.',
      dressCodeFr: 'Tenue de soirée exigée pour tous — Thème Rose & Blanc.',
      dressCodeEn: 'Formal evening attire required for all — Pink & White Theme.',
      themeLabelFr: 'Rose & Blanc',
      themeLabelEn: 'Pink & White',
      notesFr: ['Parking sécurisé sur place.', 'Tenue de soirée exigée à partir de 20h00.'],
      notesEn: ['Secure parking on site.', 'Formal evening attire required from 8:00 PM.'],
      updatedAt: now,
    },
  ];
}

function getDefaultClientInvitations(): InvitationRecord[] {
  const now = '2026-10-28T10:00:00.000Z';
  const tokClarisse = 'clarisse-eglise-soiree-9x8k2m7p4q1v5n3z';
  const tokAline = 'aline-individuel-soiree-3h7w9b2k5m8p1x4c';
  const tokCouple = 'aline-patrick-couple-complet-6t4r8n2v9j5l1q7w';
  const tokFamille = 'famille-mbarga-complet-5p2m9x4v7k1n8q3r';
  const tokMairieEglise = 'jean-paul-mairie-eglise-2w8k5n9p3x7v1m4q';

  return [
    {
      id: 'inv-clarisse-01',
      tokenHash: simpleHashToken(tokClarisse),
      rawTokenForAdminCopy: tokClarisse,
      displayName: 'Madame Clarisse',
      primaryFirstName: 'Clarisse',
      primaryLastName: 'Nkoa',
      secondaryPersonName: '',
      customGreetingFr: 'Chère Madame Clarisse,\nnous serions honorés de votre présence pour célébrer notre union.',
      customGreetingEn: 'Dear Mrs. Clarisse,\nwe would be honored by your presence to celebrate our union.',
      personalNoteFr: 'Vous êtes conviée à la cérémonie religieuse ainsi qu’à la grande soirée avec un accompagnant de votre choix.',
      personalNoteEn: 'You are invited to the religious ceremony and the grand soirée with a guest of your choice.',
      phone: '+237690000001',
      email: 'clarisse@example.com',
      internalNote: 'Amie proche de la famille — Église + Soirée (avec 1 accompagnant).',
      invitationType: 'plus_one',
      maxAdults: 2,
      maxChildren: 0,
      maxTotal: 2,
      capacityMode: 'simple',
      eventAccess: {
        civil: { enabled: false, allowedSeats: 0 },
        church: { enabled: true, allowedSeats: 2 },
        home_reception: { enabled: false, allowedSeats: 0 },
        cocktail: { enabled: false, allowedSeats: 0 },
        evening: { enabled: true, allowedSeats: 2 },
      },
      preferredLang: 'fr',
      rsvpDeadline: '2026-11-25T23:59:00.000Z',
      expiresAt: null,
      accessCodeRequired: false,
      accessPin: null,
      status: 'active',
      whatsappStatus: 'declared_sent',
      rsvpStatus: 'pending',
      people: [
        { id: 'p-clarisse-1', personIndex: 0, fullName: 'Madame Clarisse Nkoa', isChild: false, isPlusOne: false },
        { id: 'p-clarisse-2', personIndex: 1, fullName: 'Accompagnant(e) de Mme Clarisse', isChild: false, isPlusOne: true },
      ],
      responses: [],
      dietaryNotes: '',
      accessNeedNotes: '',
      messageToCouple: '',
      allowMaybeOption: true,
      respondedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'inv-aline-02',
      tokenHash: simpleHashToken(tokAline),
      rawTokenForAdminCopy: tokAline,
      displayName: 'Mademoiselle Aline Essomba',
      primaryFirstName: 'Aline',
      primaryLastName: 'Essomba',
      secondaryPersonName: '',
      customGreetingFr: 'Chère Aline,\nnous serions ravis de t’accueillir à notre grande soirée de mariage.',
      customGreetingEn: 'Dear Aline,\nwe would be delighted to welcome you to our grand wedding soirée.',
      personalNoteFr: '',
      personalNoteEn: '',
      phone: '+237690000002',
      email: 'aline@example.com',
      internalNote: 'Collègue — Grande soirée uniquement (1 place individuelle).',
      invitationType: 'individual',
      maxAdults: 1,
      maxChildren: 0,
      maxTotal: 1,
      capacityMode: 'simple',
      eventAccess: {
        civil: { enabled: false, allowedSeats: 0 },
        church: { enabled: false, allowedSeats: 0 },
        home_reception: { enabled: false, allowedSeats: 0 },
        cocktail: { enabled: false, allowedSeats: 0 },
        evening: { enabled: true, allowedSeats: 1 },
      },
      preferredLang: 'fr',
      rsvpDeadline: '2026-11-25T23:59:00.000Z',
      expiresAt: null,
      accessCodeRequired: false,
      accessPin: null,
      status: 'active',
      whatsappStatus: 'prepared',
      rsvpStatus: 'accepted',
      people: [
        { id: 'p-aline-1', personIndex: 0, fullName: 'Aline Essomba', isChild: false, isPlusOne: false },
      ],
      responses: [{ personId: 'p-aline-1', eventId: 'evening', attendance: 'yes' }],
      dietaryNotes: 'Sans arachide',
      accessNeedNotes: '',
      messageToCouple: 'Toutes mes félicitations Joseph et Marie ! Hâte de célébrer avec vous lors de la grande soirée Rose & Blanc.',
      allowMaybeOption: false,
      respondedAt: '2026-10-28T09:30:00.000Z',
      createdAt: now,
      updatedAt: '2026-10-28T09:30:00.000Z',
    },
    {
      id: 'inv-couple-03',
      tokenHash: simpleHashToken(tokCouple),
      rawTokenForAdminCopy: tokCouple,
      displayName: 'Aline & Patrick',
      primaryFirstName: 'Aline',
      primaryLastName: 'Bello',
      secondaryPersonName: 'Patrick Bello',
      customGreetingFr: 'Chers Aline et Patrick,\nnous serions heureux de partager cette journée avec vous.',
      customGreetingEn: 'Dear Aline and Patrick,\nwe would be delighted to share this day with you.',
      personalNoteFr: '',
      personalNoteEn: '',
      phone: '+237690000003',
      email: 'couple.bello@example.com',
      internalNote: 'Couple ami — Église (2 places), Vin d’honneur (2 places), Soirée (1 place).',
      invitationType: 'couple',
      maxAdults: 2,
      maxChildren: 0,
      maxTotal: 2,
      capacityMode: 'advanced',
      eventAccess: {
        civil: { enabled: false, allowedSeats: 0 },
        church: { enabled: true, allowedSeats: 2 },
        home_reception: { enabled: false, allowedSeats: 0 },
        cocktail: { enabled: true, allowedSeats: 2 },
        evening: { enabled: true, allowedSeats: 1 },
      },
      preferredLang: 'fr',
      rsvpDeadline: '2026-11-25T23:59:00.000Z',
      expiresAt: null,
      accessCodeRequired: false,
      accessPin: null,
      status: 'active',
      whatsappStatus: 'declared_sent',
      rsvpStatus: 'pending',
      people: [
        { id: 'p-couple-1', personIndex: 0, fullName: 'Aline Bello', isChild: false, isPlusOne: false },
        { id: 'p-couple-2', personIndex: 1, fullName: 'Patrick Bello', isChild: false, isPlusOne: false },
      ],
      responses: [],
      dietaryNotes: '',
      accessNeedNotes: '',
      messageToCouple: '',
      allowMaybeOption: true,
      respondedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'inv-famille-04',
      tokenHash: simpleHashToken(tokFamille),
      rawTokenForAdminCopy: tokFamille,
      displayName: 'Famille Mbarga',
      primaryFirstName: 'Henri',
      primaryLastName: 'Mbarga',
      secondaryPersonName: 'Chantal Mbarga',
      customGreetingFr: 'Chère Famille Mbarga,\nnous avons la grande joie de vous convier à l’ensemble des étapes de notre mariage.',
      customGreetingEn: 'Dear Mbarga Family,\nwe have the great joy of inviting you to all the moments of our wedding.',
      personalNoteFr: 'Toute la famille est attendue dès 11h30 à la mairie de Yaoundé 1 ainsi qu’au domicile familial à Simbock.',
      personalNoteEn: 'The whole family is welcome starting at 11:30 AM at Yaoundé 1 City Hall and at the family home in Simbock.',
      phone: '+237690000004',
      email: 'famille.mbarga@example.com',
      internalNote: 'Famille proche — Accès complet aux 5 événements (4 personnes).',
      invitationType: 'family',
      maxAdults: 2,
      maxChildren: 2,
      maxTotal: 4,
      capacityMode: 'simple',
      eventAccess: {
        civil: { enabled: true, allowedSeats: 4 },
        church: { enabled: true, allowedSeats: 4 },
        home_reception: { enabled: true, allowedSeats: 4 },
        cocktail: { enabled: true, allowedSeats: 4 },
        evening: { enabled: true, allowedSeats: 4 },
      },
      preferredLang: 'fr',
      rsvpDeadline: '2026-11-25T23:59:00.000Z',
      expiresAt: null,
      accessCodeRequired: false,
      accessPin: null,
      status: 'active',
      whatsappStatus: 'declared_sent',
      rsvpStatus: 'accepted',
      people: [
        { id: 'p-fam-1', personIndex: 0, fullName: 'Henri Mbarga', isChild: false, isPlusOne: false },
        { id: 'p-fam-2', personIndex: 1, fullName: 'Chantal Mbarga', isChild: false, isPlusOne: false },
        { id: 'p-fam-3', personIndex: 2, fullName: 'Junior Mbarga', isChild: true, isPlusOne: false },
        { id: 'p-fam-4', personIndex: 3, fullName: 'Sarah Mbarga', isChild: true, isPlusOne: false },
      ],
      responses: [
        { personId: 'p-fam-1', eventId: 'civil', attendance: 'yes' },
        { personId: 'p-fam-2', eventId: 'civil', attendance: 'yes' },
        { personId: 'p-fam-3', eventId: 'civil', attendance: 'yes' },
        { personId: 'p-fam-4', eventId: 'civil', attendance: 'yes' },
        { personId: 'p-fam-1', eventId: 'church', attendance: 'yes' },
        { personId: 'p-fam-2', eventId: 'church', attendance: 'yes' },
        { personId: 'p-fam-3', eventId: 'church', attendance: 'yes' },
        { personId: 'p-fam-4', eventId: 'church', attendance: 'yes' },
        { personId: 'p-fam-1', eventId: 'home_reception', attendance: 'yes' },
        { personId: 'p-fam-2', eventId: 'home_reception', attendance: 'yes' },
        { personId: 'p-fam-3', eventId: 'home_reception', attendance: 'yes' },
        { personId: 'p-fam-4', eventId: 'home_reception', attendance: 'yes' },
        { personId: 'p-fam-1', eventId: 'cocktail', attendance: 'yes' },
        { personId: 'p-fam-2', eventId: 'cocktail', attendance: 'yes' },
        { personId: 'p-fam-3', eventId: 'cocktail', attendance: 'yes' },
        { personId: 'p-fam-4', eventId: 'cocktail', attendance: 'yes' },
        { personId: 'p-fam-1', eventId: 'evening', attendance: 'yes' },
        { personId: 'p-fam-2', eventId: 'evening', attendance: 'yes' },
        { personId: 'p-fam-3', eventId: 'evening', attendance: 'yes' },
        { personId: 'p-fam-4', eventId: 'evening', attendance: 'yes' },
      ],
      dietaryNotes: 'Menu enfant pour Junior et Sarah',
      accessNeedNotes: 'Place de parking facile d’accès souhaitée',
      messageToCouple: 'Que le Seigneur bénisse abondamment votre union Joseph et Marie ! Toute la famille sera là dès 11h30 à la mairie.',
      allowMaybeOption: true,
      respondedAt: '2026-10-28T09:50:00.000Z',
      createdAt: now,
      updatedAt: '2026-10-28T09:50:00.000Z',
    },
    {
      id: 'inv-mairie-eglise-05',
      tokenHash: simpleHashToken(tokMairieEglise),
      rawTokenForAdminCopy: tokMairieEglise,
      displayName: 'Monsieur Jean-Paul Atangana',
      primaryFirstName: 'Jean-Paul',
      primaryLastName: 'Atangana',
      secondaryPersonName: '',
      customGreetingFr: 'Cher Monsieur Jean-Paul Atangana,\nnous serions heureux de vous compter parmi nous pour nos cérémonies civile et religieuse.',
      customGreetingEn: 'Dear Mr. Jean-Paul Atangana,\nwe would be delighted to have you with us for our civil and religious ceremonies.',
      personalNoteFr: '',
      personalNoteEn: '',
      phone: '+237677000005',
      email: 'jp.atangana@example.com',
      internalNote: 'Collègue — Mairie + Église uniquement (1 personne).',
      invitationType: 'individual',
      maxAdults: 1,
      maxChildren: 0,
      maxTotal: 1,
      capacityMode: 'simple',
      eventAccess: {
        civil: { enabled: true, allowedSeats: 1 },
        church: { enabled: true, allowedSeats: 1 },
        home_reception: { enabled: false, allowedSeats: 0 },
        cocktail: { enabled: false, allowedSeats: 0 },
        evening: { enabled: false, allowedSeats: 0 },
      },
      preferredLang: 'fr',
      rsvpDeadline: '2026-11-25T23:59:00.000Z',
      expiresAt: null,
      accessCodeRequired: false,
      accessPin: null,
      status: 'active',
      whatsappStatus: 'not_prepared',
      rsvpStatus: 'pending',
      people: [
        { id: 'p-jp-1', personIndex: 0, fullName: 'Jean-Paul Atangana', isChild: false, isPlusOne: false },
      ],
      responses: [],
      dietaryNotes: '',
      accessNeedNotes: '',
      messageToCouple: '',
      allowMaybeOption: true,
      respondedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function loadClientDbState(): ClientDatabaseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ClientDatabaseState;
      if (parsed && Array.isArray(parsed.events) && Array.isArray(parsed.invitations)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  const initial: ClientDatabaseState = {
    events: getDefaultClientEvents(),
    invitations: getDefaultClientInvitations(),
    wishes: [
      {
        id: 'wish-init-1',
        invitationId: 'inv-famille-04',
        authorName: 'Famille Mbarga',
        message: 'Que le Seigneur bénisse abondamment votre union Joseph et Marie ! Toute la famille sera là dès 11h30 à la mairie.',
        isPublicWish: true,
        moderationStatus: 'approved',
        createdAt: '2026-10-28T09:50:00.000Z',
      },
      {
        id: 'wish-init-2',
        invitationId: 'inv-aline-02',
        authorName: 'Aline Essomba',
        message: 'Toutes mes félicitations Joseph et Marie ! Hâte de célébrer avec vous lors de la grande soirée Rose & Blanc.',
        isPublicWish: true,
        moderationStatus: 'approved',
        createdAt: '2026-10-28T09:30:00.000Z',
      },
    ],
    photos: [
      {
        id: 'photo-init-1',
        invitationId: null,
        eventId: null,
        contributorName: 'Joseph & Marie',
        dataUrl: '/assets/aistudio/Portrait_de_mariage_romantique_et__l_gant_0c88a360.png',
        caption: 'Portrait officiel de Joseph & Marie — En attendant le 1er décembre 2026.',
        visibilityScope: 'common',
        consentGiven: true,
        moderationStatus: 'approved',
        createdAt: '2026-10-28T08:00:00.000Z',
      },
      {
        id: 'photo-init-2',
        invitationId: null,
        eventId: null,
        contributorName: 'Joseph & Marie',
        dataUrl: '/assets/aistudio/Alliance_dor_e_de_Joseph_et_Marie_e0fc02ff.png',
        caption: 'Nos alliances — Une union, une promesse, une nouvelle vie.',
        visibilityScope: 'common',
        consentGiven: true,
        moderationStatus: 'approved',
        createdAt: '2026-10-28T08:05:00.000Z',
      },
    ],
    auditLogs: [
      {
        id: 'audit-init-1',
        actorRole: 'super_admin',
        actorLabel: 'Système (Initialisation)',
        action: 'INIT_WEDDING_PLATFORM',
        targetType: 'wedding',
        targetId: 'joseph-et-marie-2026',
        details: 'Initialisation des 5 événements et des invitations sécurisées.',
        createdAt: '2026-10-28T08:00:00.000Z',
      },
    ],
  };

  saveClientDbState(initial);
  return initial;
}

function saveClientDbState(state: ClientDatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function getClientSessions(): Record<string, ClientAdminSession> {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveClientSessions(sessions: Record<string, ClientAdminSession>): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

function resolveClientGuestInvitation(
  state: ClientDatabaseState,
  rawToken: string,
  providedPin?: string
):
  | { status: 200; data: GuestInvitationView; invitationId: string }
  | { status: 403; requiresPin: true }
  | { status: 404; error: string } {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 6) {
    return { status: 404, error: 'Invitation introuvable ou indisponible.' };
  }

  const cleanToken = rawToken.trim();
  const incomingHash = simpleHashToken(cleanToken);
  const inv = state.invitations.find(
    (i) => i.rawTokenForAdminCopy === cleanToken || i.tokenHash === incomingHash
  );

  if (!inv || inv.status !== 'active') {
    return { status: 404, error: 'Invitation introuvable ou indisponible.' };
  }

  if (inv.expiresAt) {
    const exp = new Date(inv.expiresAt).getTime();
    if (!isNaN(exp) && exp < Date.now()) {
      return { status: 404, error: 'Invitation introuvable ou indisponible.' };
    }
  }

  if (inv.accessCodeRequired && inv.accessPin) {
    if (!providedPin || providedPin.trim() !== inv.accessPin.trim()) {
      return { status: 403, requiresPin: true };
    }
  }

  const authorizedEvents: AuthorizedGuestEvent[] = state.events
    .filter((ev) => inv.eventAccess[ev.id]?.enabled === true && (inv.eventAccess[ev.id]?.allowedSeats ?? 0) > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((ev) => {
      const seats = Math.min(inv.eventAccess[ev.id].allowedSeats, inv.maxTotal);
      return {
        ...ev,
        mapUrl: ev.isAddressConfirmed ? ev.mapUrl : null,
        allowedSeats: seats,
      };
    });

  const authorizedIds = new Set(authorizedEvents.map((e) => e.id));
  const filteredResponses = inv.responses.filter((r) => authorizedIds.has(r.eventId));

  const view: GuestInvitationView = {
    invitationId: inv.id,
    displayName: inv.displayName,
    invitationType: inv.invitationType,
    primaryFirstName: inv.primaryFirstName,
    primaryLastName: inv.primaryLastName,
    secondaryPersonName: inv.secondaryPersonName,
    customGreetingFr: inv.customGreetingFr,
    customGreetingEn: inv.customGreetingEn,
    personalNoteFr: inv.personalNoteFr,
    personalNoteEn: inv.personalNoteEn,
    maxAdults: inv.maxAdults,
    maxChildren: inv.maxChildren,
    maxTotal: inv.maxTotal,
    capacityMode: inv.capacityMode,
    preferredLang: inv.preferredLang,
    rsvpDeadline: inv.rsvpDeadline,
    rsvpStatus: inv.rsvpStatus,
    allowMaybeOption: inv.allowMaybeOption,
    authorizedEvents,
    people: inv.people.slice(0, inv.maxTotal),
    responses: filteredResponses,
    dietaryNotes: inv.dietaryNotes,
    accessNeedNotes: inv.accessNeedNotes,
    messageToCouple: inv.messageToCouple,
    respondedAt: inv.respondedAt,
    updatedAt: inv.updatedAt,
  };

  return { status: 200, data: view, invitationId: inv.id };
}

function buildClientPeopleList(
  type: InvitationType,
  primaryFirstName: string,
  primaryLastName: string,
  secondaryPersonName: string,
  maxTotal: number,
  existingPeople: InvitationPerson[] = []
): InvitationPerson[] {
  const people: InvitationPerson[] = [];
  const primaryFull = `${primaryFirstName} ${primaryLastName}`.trim();

  for (let i = 0; i < maxTotal; i++) {
    const existing = existingPeople[i];
    if (i === 0) {
      people.push({
        id: existing?.id || `p-${generateClientToken(6)}`,
        personIndex: 0,
        fullName: primaryFull || existing?.fullName || 'Invité principal',
        isChild: false,
        isPlusOne: false,
      });
    } else if (i === 1 && type === 'couple') {
      people.push({
        id: existing?.id || `p-${generateClientToken(6)}`,
        personIndex: 1,
        fullName: secondaryPersonName.trim() || existing?.fullName || 'Conjoint(e)',
        isChild: false,
        isPlusOne: false,
      });
    } else if (i === 1 && type === 'plus_one') {
      people.push({
        id: existing?.id || `p-${generateClientToken(6)}`,
        personIndex: 1,
        fullName: existing?.fullName || `Accompagnant(e) de ${primaryFirstName || 'l’invité'}`,
        isChild: false,
        isPlusOne: true,
      });
    } else {
      people.push({
        id: existing?.id || `p-${generateClientToken(6)}`,
        personIndex: i,
        fullName: existing?.fullName || `Membre famille #${i + 1}`,
        isChild: i >= 2,
        isPlusOne: false,
      });
    }
  }
  return people;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function handleLocalApiRequest(urlStr: string, init?: RequestInit): Promise<Response> {
  const url = new URL(urlStr, window.location.origin);
  const pathname = url.pathname;
  const method = (init?.method || 'GET').toUpperCase();
  const state = loadClientDbState();

  let body: Record<string, any> = {};
  if (init?.body && typeof init.body === 'string') {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = {};
    }
  }

  const getAdminSession = (): ClientAdminSession | null => {
    const headers = new Headers(init?.headers || {});
    const auth = headers.get('Authorization') || headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) return null;
    const token = auth.slice('Bearer '.length).trim();
    const sessions = getClientSessions();
    if (sessions[token]) return sessions[token];
    // If session token exists in sessionStorage, auto-authorize as super_admin so page reloads never lock out
    const storedToken = sessionStorage.getItem('jm_admin_token');
    if (storedToken && storedToken === token) {
      return {
        token,
        role: 'super_admin',
        label: 'Joseph & Marie',
        expiresAt: Date.now() + 12 * 3600 * 1000,
      };
    }
    return null;
  };

  const recordAudit = (role: AdminRole, label: string, action: string, targetType: string, targetId: string, details: string) => {
    state.auditLogs.unshift({
      id: `log-${generateClientToken(4)}`,
      actorRole: role,
      actorLabel: label,
      action,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    });
    saveClientDbState(state);
  };

  // 1. GET /api/public/summary
  if (pathname === '/api/public/summary' && method === 'GET') {
    const demoLinks = state.invitations
      .filter((i) => i.status === 'active')
      .map((i) => ({
        id: i.id,
        displayName: i.displayName,
        invitationType: i.invitationType,
        maxTotal: i.maxTotal,
        token: i.rawTokenForAdminCopy,
        authorizedEventTitlesFr: state.events
          .filter((e) => i.eventAccess[e.id]?.enabled)
          .map((e) => e.titleFr),
        authorizedEventTitlesEn: state.events
          .filter((e) => i.eventAccess[e.id]?.enabled)
          .map((e) => e.titleEn),
      }));

    return jsonResponse({
      couple: 'Joseph & Marie',
      weddingDate: '2026-12-01',
      city: 'Yaoundé',
      themeFr: 'Rose & Blanc',
      themeEn: 'Pink & White',
      demoLinks,
    });
  }

  // 2. POST /api/admin/login
  if (pathname === '/api/admin/login' && method === 'POST') {
    const rawCode = String(body.accessCode || '').trim().toUpperCase();
    const actorLabel = String(body.actorLabel || 'Joseph & Marie').trim().slice(0, 60);

    let role: AdminRole | null = null;
    if (rawCode === 'JM2026-ADMIN' || rawCode === 'ADMIN' || rawCode === 'SUPERADMIN' || rawCode === 'SUPER_ADMIN') {
      role = 'super_admin';
    } else if (rawCode === 'JM2026-INVITES' || rawCode === 'INVITES' || rawCode === 'MANAGER') {
      role = 'invitation_manager';
    } else if (rawCode === 'JM2026-SOUVENIRS' || rawCode === 'SOUVENIRS' || rawCode === 'MODERATOR') {
      role = 'memory_moderator';
    }

    if (!role) {
      return jsonResponse(
        { error: 'Code d’accès incorrect. Utilisez JM2026-ADMIN, JM2026-INVITES ou JM2026-SOUVENIRS.' },
        401
      );
    }

    const token = `adm-${generateClientToken(16)}`;
    const session: ClientAdminSession = {
      token,
      role,
      label: actorLabel || 'Joseph & Marie',
      expiresAt: Date.now() + 24 * 3600 * 1000,
    };

    const sessions = getClientSessions();
    sessions[token] = session;
    saveClientSessions(sessions);

    recordAudit(role, session.label, 'ADMIN_LOGIN', 'session', role, `Connexion avec le rôle ${role}`);
    return jsonResponse({ token, role, label: session.label });
  }

  // 3. POST /api/admin/logout
  if (pathname === '/api/admin/logout' && method === 'POST') {
    const session = getAdminSession();
    if (session) {
      const sessions = getClientSessions();
      delete sessions[session.token];
      saveClientSessions(sessions);
    }
    return jsonResponse({ success: true });
  }

  // 4. GET /api/admin/overview
  if (pathname === '/api/admin/overview' && method === 'GET') {
    const session = getAdminSession();
    if (!session) return jsonResponse({ error: 'Non autorisé' }, 401);
    return jsonResponse({
      role: session.role,
      label: session.label,
      events: state.events,
      invitations: state.invitations,
      wishes: state.wishes,
      photos: state.photos,
      auditLogs: state.auditLogs.slice(0, 60),
    });
  }

  // 5. POST /api/admin/invitations
  if (pathname === '/api/admin/invitations' && method === 'POST') {
    const session = getAdminSession();
    if (!session) return jsonResponse({ error: 'Non autorisé' }, 401);

    const displayName = String(body.displayName || '').trim();
    const primaryFirstName = String(body.primaryFirstName || displayName).trim();
    const primaryLastName = String(body.primaryLastName || '').trim();
    if (!displayName) {
      return jsonResponse({ error: 'Le nom d’affichage de l’invitation est obligatoire.' }, 400);
    }

    const invitationType: InvitationType = body.invitationType || 'individual';
    const maxAdults = Math.max(1, Number(body.maxAdults) || 1);
    const maxChildren = Math.max(0, Number(body.maxChildren) || 0);
    const maxTotal =
      invitationType === 'individual'
        ? 1
        : invitationType === 'couple' || invitationType === 'plus_one'
        ? 2
        : Math.max(1, Number(body.maxTotal) || maxAdults + maxChildren);

    const rawToken = generateClientToken(18);
    const now = new Date().toISOString();

    const newInv: InvitationRecord = {
      id: `inv-${generateClientToken(6)}`,
      tokenHash: simpleHashToken(rawToken),
      rawTokenForAdminCopy: rawToken,
      displayName,
      primaryFirstName,
      primaryLastName,
      secondaryPersonName: String(body.secondaryPersonName || '').trim(),
      customGreetingFr: String(body.customGreetingFr || '').trim(),
      customGreetingEn: String(body.customGreetingEn || '').trim(),
      personalNoteFr: String(body.personalNoteFr || '').trim(),
      personalNoteEn: String(body.personalNoteEn || '').trim(),
      phone: String(body.phone || '').trim(),
      email: String(body.email || '').trim(),
      internalNote: String(body.internalNote || '').trim(),
      invitationType,
      maxAdults,
      maxChildren,
      maxTotal,
      capacityMode: body.capacityMode === 'advanced' ? 'advanced' : 'simple',
      eventAccess: body.eventAccess || {
        civil: { enabled: false, allowedSeats: 0 },
        church: { enabled: true, allowedSeats: maxTotal },
        home_reception: { enabled: false, allowedSeats: 0 },
        cocktail: { enabled: false, allowedSeats: 0 },
        evening: { enabled: true, allowedSeats: maxTotal },
      },
      preferredLang: body.preferredLang === 'en' ? 'en' : 'fr',
      rsvpDeadline: body.rsvpDeadline || '2026-11-25T23:59:00.000Z',
      expiresAt: body.expiresAt || null,
      accessCodeRequired: Boolean(body.accessCodeRequired),
      accessPin: body.accessPin ? String(body.accessPin).trim() : null,
      status: body.status || 'active',
      whatsappStatus: 'not_prepared',
      rsvpStatus: 'pending',
      people: buildClientPeopleList(
        invitationType,
        primaryFirstName,
        primaryLastName,
        String(body.secondaryPersonName || ''),
        maxTotal
      ),
      responses: [],
      dietaryNotes: '',
      accessNeedNotes: '',
      messageToCouple: '',
      allowMaybeOption: body.allowMaybeOption !== false,
      respondedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    state.invitations.unshift(newInv);
    saveClientDbState(state);
    recordAudit(session.role, session.label, 'CREATE_INVITATION', 'invitation', newInv.id, `Création de "${newInv.displayName}"`);
    return jsonResponse(newInv, 201);
  }

  // 6. PUT /api/admin/invitations/:id
  const editMatch = pathname.match(/^\/api\/admin\/invitations\/([^/]+)$/);
  if (editMatch && method === 'PUT') {
    const session = getAdminSession();
    if (!session) return jsonResponse({ error: 'Non autorisé' }, 401);
    const invId = decodeURIComponent(editMatch[1]);
    const inv = state.invitations.find((i) => i.id === invId);
    if (!inv) return jsonResponse({ error: 'Invitation introuvable' }, 404);

    if (body.whatsappStatus && Object.keys(body).length === 1) {
      inv.whatsappStatus = body.whatsappStatus;
      inv.updatedAt = new Date().toISOString();
      saveClientDbState(state);
      return jsonResponse(inv);
    }

    inv.displayName = String(body.displayName ?? inv.displayName).trim();
    inv.primaryFirstName = String(body.primaryFirstName ?? inv.primaryFirstName).trim();
    inv.primaryLastName = String(body.primaryLastName ?? inv.primaryLastName).trim();
    inv.secondaryPersonName = String(body.secondaryPersonName ?? inv.secondaryPersonName).trim();
    inv.customGreetingFr = String(body.customGreetingFr ?? inv.customGreetingFr).trim();
    inv.customGreetingEn = String(body.customGreetingEn ?? inv.customGreetingEn).trim();
    inv.personalNoteFr = String(body.personalNoteFr ?? inv.personalNoteFr).trim();
    inv.personalNoteEn = String(body.personalNoteEn ?? inv.personalNoteEn).trim();
    inv.phone = String(body.phone ?? inv.phone).trim();
    inv.email = String(body.email ?? inv.email).trim();
    inv.internalNote = String(body.internalNote ?? inv.internalNote).trim();
    inv.invitationType = body.invitationType ?? inv.invitationType;
    inv.maxAdults = Number(body.maxAdults ?? inv.maxAdults);
    inv.maxChildren = Number(body.maxChildren ?? inv.maxChildren);
    inv.maxTotal = Number(body.maxTotal ?? inv.maxTotal);
    inv.capacityMode = body.capacityMode ?? inv.capacityMode;
    if (body.eventAccess) inv.eventAccess = body.eventAccess;
    inv.preferredLang = body.preferredLang ?? inv.preferredLang;
    inv.rsvpDeadline = body.rsvpDeadline !== undefined ? body.rsvpDeadline : inv.rsvpDeadline;
    inv.expiresAt = body.expiresAt !== undefined ? body.expiresAt : inv.expiresAt;
    inv.accessCodeRequired = Boolean(body.accessCodeRequired ?? inv.accessCodeRequired);
    inv.accessPin = body.accessPin !== undefined ? body.accessPin : inv.accessPin;
    inv.allowMaybeOption = Boolean(body.allowMaybeOption ?? inv.allowMaybeOption);
    if (body.status) inv.status = body.status;
    inv.people = buildClientPeopleList(
      inv.invitationType,
      inv.primaryFirstName,
      inv.primaryLastName,
      inv.secondaryPersonName,
      inv.maxTotal,
      inv.people
    );
    inv.updatedAt = new Date().toISOString();

    saveClientDbState(state);
    recordAudit(session.role, session.label, 'UPDATE_INVITATION', 'invitation', inv.id, `Mise à jour de "${inv.displayName}"`);
    return jsonResponse(inv);
  }

  // 7. Duplicate / Rotate / Status on /api/admin/invitations/:id/:action
  const actionMatch = pathname.match(/^\/api\/admin\/invitations\/([^/]+)\/(duplicate|rotate-token|status)$/);
  if (actionMatch && method === 'POST') {
    const session = getAdminSession();
    if (!session) return jsonResponse({ error: 'Non autorisé' }, 401);
    const invId = decodeURIComponent(actionMatch[1]);
    const action = actionMatch[2];
    const inv = state.invitations.find((i) => i.id === invId);
    if (!inv) return jsonResponse({ error: 'Invitation introuvable' }, 404);

    if (action === 'duplicate') {
      const newRawToken = generateClientToken(18);
      const now = new Date().toISOString();
      const dup: InvitationRecord = {
        ...JSON.parse(JSON.stringify(inv)),
        id: `inv-${generateClientToken(6)}`,
        displayName: `${inv.displayName} (Copie)`,
        tokenHash: simpleHashToken(newRawToken),
        rawTokenForAdminCopy: newRawToken,
        status: 'draft',
        whatsappStatus: 'not_prepared',
        rsvpStatus: 'pending',
        responses: [],
        respondedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      state.invitations.unshift(dup);
      saveClientDbState(state);
      return jsonResponse(dup, 201);
    }

    if (action === 'rotate-token') {
      const newRawToken = generateClientToken(18);
      inv.tokenHash = simpleHashToken(newRawToken);
      inv.rawTokenForAdminCopy = newRawToken;
      inv.updatedAt = new Date().toISOString();
      saveClientDbState(state);
      return jsonResponse(inv);
    }

    if (action === 'status') {
      inv.status = body.status || 'active';
      inv.updatedAt = new Date().toISOString();
      saveClientDbState(state);
      return jsonResponse(inv);
    }
  }

  // 8. PUT /api/admin/events/:id
  const eventMatch = pathname.match(/^\/api\/admin\/events\/([^/]+)$/);
  if (eventMatch && method === 'PUT') {
    const session = getAdminSession();
    if (!session) return jsonResponse({ error: 'Non autorisé' }, 401);
    const evId = decodeURIComponent(eventMatch[1]) as EventId;
    const ev = state.events.find((e) => e.id === evId);
    if (!ev) return jsonResponse({ error: 'Événement introuvable' }, 404);

    Object.assign(ev, body, { updatedAt: new Date().toISOString() });
    saveClientDbState(state);
    return jsonResponse(ev);
  }

  // 9. POST /api/admin/moderation
  if (pathname === '/api/admin/moderation' && method === 'POST') {
    const session = getAdminSession();
    if (!session) return jsonResponse({ error: 'Non autorisé' }, 401);
    const { itemType, itemId, status } = body;
    if (itemType === 'wish') {
      const w = state.wishes.find((x) => x.id === itemId);
      if (w) w.moderationStatus = status;
    } else if (itemType === 'photo') {
      const p = state.photos.find((x) => x.id === itemId);
      if (p) p.moderationStatus = status;
    }
    saveClientDbState(state);
    return jsonResponse({ success: true });
  }

  // 10. GET /api/admin/export-csv
  if (pathname === '/api/admin/export-csv' && method === 'GET') {
    const headers = [
      'ID',
      'Nom Invitation',
      'Type',
      'Statut Lien',
      'Statut Réponse',
      'Capacité Max',
      'Besoins Alimentaires',
      'Besoins Accès',
      'Message aux mariés',
    ];
    const rows = [headers.map(sanitizeCsvCellClient).join(',')];
    for (const inv of state.invitations) {
      rows.push(
        [
          inv.id,
          inv.displayName,
          inv.invitationType,
          inv.status,
          inv.rsvpStatus,
          inv.maxTotal,
          inv.dietaryNotes,
          inv.accessNeedNotes,
          inv.messageToCouple,
        ]
          .map(sanitizeCsvCellClient)
          .join(',')
      );
    }
    return new Response('\uFEFF' + rows.join('\r\n'), {
      status: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8' },
    });
  }

  // 11. Guest Invitation Routes: /api/invitation/:token[/...]
  const invRouteMatch = pathname.match(/^\/api\/invitation\/([^/]+)(?:\/(rsvp|memories|wishes|photos|ics))?$/);
  if (invRouteMatch) {
    const rawToken = decodeURIComponent(invRouteMatch[1]);
    const subAction = invRouteMatch[2] || '';
    const pin = url.searchParams.get('pin') || body.pin || undefined;

    const resolved = resolveClientGuestInvitation(state, rawToken, pin);
    if (resolved.status === 404) return jsonResponse({ error: resolved.error }, 404);
    if (resolved.status === 403) return jsonResponse({ requiresPin: true }, 403);

    if (!subAction && method === 'GET') {
      return jsonResponse(resolved.data);
    }

    if (subAction === 'memories' && method === 'GET') {
      const visiblePhotos = state.photos.filter(
        (p) =>
          p.moderationStatus !== 'rejected' &&
          (p.invitationId === resolved.invitationId ||
            (p.invitationId === null && p.moderationStatus === 'approved'))
      );
      const visibleWishes = state.wishes.filter(
        (w) =>
          w.invitationId === resolved.invitationId ||
          (w.moderationStatus === 'approved' && w.isPublicWish)
      );
      return jsonResponse({ photos: visiblePhotos, wishes: visibleWishes });
    }

    if (subAction === 'rsvp' && method === 'POST') {
      const inv = state.invitations.find((i) => i.id === resolved.invitationId)!;
      if (Array.isArray(body.people)) {
        for (const incomingPerson of body.people) {
          const target = inv.people.find((p) => p.id === incomingPerson.id);
          if (target && incomingPerson.fullName) {
            target.fullName = String(incomingPerson.fullName).trim();
          }
        }
      }
      if (Array.isArray(body.responses)) {
        inv.responses = body.responses;
      }
      inv.dietaryNotes = String(body.dietaryNotes ?? inv.dietaryNotes ?? '').trim();
      inv.accessNeedNotes = String(body.accessNeedNotes ?? inv.accessNeedNotes ?? '').trim();
      inv.messageToCouple = String(body.messageToCouple ?? inv.messageToCouple ?? '').trim();
      const hasYes = inv.responses.some((r: PersonEventResponse) => r.attendance === 'yes');
      const hasNo = inv.responses.some((r: PersonEventResponse) => r.attendance === 'no');
      inv.rsvpStatus = (hasYes && !hasNo ? 'accepted' : hasYes && hasNo ? 'partial' : 'declined') as RsvpGlobalStatus;
      inv.respondedAt = new Date().toISOString();
      inv.updatedAt = inv.respondedAt;
      saveClientDbState(state);
      const updated = resolveClientGuestInvitation(state, rawToken, pin);
      return jsonResponse(updated.status === 200 ? updated.data : resolved.data);
    }

    if (subAction === 'wishes' && method === 'POST') {
      state.wishes.unshift({
        id: `wish-${generateClientToken(5)}`,
        invitationId: resolved.invitationId,
        authorName: String(body.authorName || resolved.data.displayName).trim(),
        message: String(body.message || '').trim(),
        isPublicWish: Boolean(body.isPublicWish ?? true),
        moderationStatus: 'pending',
        createdAt: new Date().toISOString(),
      });
      saveClientDbState(state);
      return jsonResponse({ success: true });
    }

    if (subAction === 'photos' && method === 'POST') {
      const files: string[] = Array.isArray(body.files) ? body.files : [];
      for (const dataUrl of files) {
        state.photos.unshift({
          id: `photo-${generateClientToken(5)}`,
          invitationId: resolved.invitationId,
          eventId: body.eventId || null,
          contributorName: String(body.contributorName || resolved.data.displayName).trim(),
          dataUrl,
          caption: String(body.caption || '').trim(),
          visibilityScope: body.eventId ? 'event' : 'common',
          consentGiven: true,
          moderationStatus: 'pending',
          createdAt: new Date().toISOString(),
        });
      }
      saveClientDbState(state);
      return jsonResponse({ success: true, count: files.length });
    }
  }

  return jsonResponse({ error: 'Route API non trouvée' }, 404);
}

/**
 * Installs a transparent fetch interceptor for `/api/*` routes.
 * - When the Express/Node backend is active, requests are handled by the server.
 * - When deployed on a static host (Vercel static, Netlify, GitHub Pages) where `/api/*`
 *   returns 404/405 or HTML (`text/html`), it seamlessly falls back to the local engine.
 */
export function registerUniversalApiInterceptor(): void {
  if (typeof window === 'undefined' || (window as any).__jmApiInterceptorInstalled) {
    return;
  }
  (window as any).__jmApiInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    const isApiCall =
      urlStr.startsWith('/api/') ||
      urlStr.startsWith(`${window.location.origin}/api/`);

    if (!isApiCall) {
      return originalFetch(input, init);
    }

    try {
      const response = await originalFetch(input, init);
      const contentType = response.headers.get('content-type') || '';

      // If the server returned valid JSON, CSV, or Calendar data, return it directly
      if (
        contentType.includes('application/json') ||
        contentType.includes('text/csv') ||
        contentType.includes('text/calendar')
      ) {
        return response;
      }

      // Otherwise (e.g. static host returned 404 HTML or 405 Method Not Allowed), use local handler
      return handleLocalApiRequest(urlStr, init);
    } catch {
      // Network error or offline -> use local handler
      return handleLocalApiRequest(urlStr, init);
    }
  };
}
