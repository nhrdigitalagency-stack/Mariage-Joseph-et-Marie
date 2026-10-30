import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AuditLogEntry,
  AuthorizedGuestEvent,
  EventId,
  GuestInvitationView,
  GuestWishMessage,
  InvitationPerson,
  InvitationRecord,
  PersonEventResponse,
  RsvpGlobalStatus,
  SharedMemoryPhoto,
  WeddingEventConfig,
} from '../types/wedding.ts';
import { saveStateToSanity } from './sanityBackend.ts';

export const ALL_EVENT_IDS: EventId[] = ['civil', 'church', 'home_reception', 'cocktail', 'evening'];

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export function generateSecureToken(): string {
  // 24 cryptographic bytes = 48 hex chars or 32 base64url chars — unguessable, non-sequential
  return crypto.randomBytes(24).toString('base64url');
}

export function sanitizeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  // Prevent CSV formula injection (=, +, -, @, tab, CR)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str}"`;
}

export interface DatabaseState {
  events: WeddingEventConfig[];
  invitations: InvitationRecord[];
  wishes: GuestWishMessage[];
  photos: SharedMemoryPhoto[];
  auditLogs: AuditLogEntry[];
}

export function getInitialEvents(): WeddingEventConfig[] {
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
      addressFr: 'Mairie de Yaoundé 1, Centre administratif — adresse exacte et repère à renseigner',
      addressEn: 'Yaoundé 1 City Hall — exact address and landmark to be confirmed',
      venueStatusNoteFr: 'Adresse exacte et lien de localisation à renseigner.',
      venueStatusNoteEn: 'Exact address and map link to be provided.',
      isAddressConfirmed: true,
      isPrivateAddress: false,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Mairie+de+Yaounde+1+Cameroun',
      descriptionFr: 'Joseph et Marie officialiseront leur union lors de la cérémonie civile, entourés de leurs proches.',
      descriptionEn: 'Joseph and Marie will officialize their union during the civil ceremony, surrounded by their loved ones.',
      dressCodeFr: 'Tenue de ville élégante et soignée.',
      dressCodeEn: 'Elegant and smart city attire.',
      notesFr: [
        'Photos avec les mariés après la cérémonie.',
        'Petite collation offerte aux invités présents à la mairie (à proximité de la mairie).'
      ],
      notesEn: [
        'Photos with the newlyweds after the ceremony.',
        'Light refreshments offered to guests attending City Hall.'
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
      venueNameFr: 'Nom de l’église à renseigner (piste étudiée : Paroisse Saints-Pierre-et-Paul de Simbock)',
      venueNameEn: 'Church name to be confirmed (option under review: Sts. Peter & Paul Parish, Simbock)',
      addressFr: 'Adresse à renseigner (repère cartographique RFCG+48R, Yaoundé — sous réserve de confirmation)',
      addressEn: 'Address to be confirmed (map code RFCG+48R, Yaoundé — subject to confirmation)',
      venueStatusNoteFr: 'À confirmer avec la paroisse : disponibilité le 1er décembre et langue de célébration.',
      venueStatusNoteEn: 'To be confirmed with the parish: availability on December 1st and celebration language.',
      isAddressConfirmed: false,
      isPrivateAddress: false,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=RFCG%2B48R+Yaounde',
      descriptionFr: 'Un moment de recueillement, de bénédiction et d’émotion pour accompagner Joseph et Marie dans leur engagement.',
      descriptionEn: 'A moment of reflection, blessing, and emotion to accompany Joseph and Marie in their commitment.',
      dressCodeFr: 'Une tenue élégante, adaptée à la cérémonie.',
      dressCodeEn: 'Elegant attire suitable for the religious ceremony.',
      notesFr: [],
      notesEn: [],
      updatedAt: now,
    },
    {
      id: 'home_reception',
      sortOrder: 3,
      titleFr: 'Un moment au domicile des mariés',
      titleEn: 'Family Welcome at the Couple’s Home',
      eventDate: '2026-12-01',
      startTime: null,
      timeLabelFr: 'Après la cérémonie religieuse',
      timeLabelEn: 'Following the religious ceremony',
      endLabelFr: null,
      endLabelEn: null,
      venueNameFr: 'Domicile des mariés à Simbock',
      venueNameEn: 'Couple’s Residence in Simbock',
      addressFr: 'Quartier Simbock, Yaoundé — adresse privée exacte et repère d’accès à renseigner (réservé aux invitations autorisées)',
      addressEn: 'Simbock district, Yaoundé — private exact address and landmark to be provided (restricted to authorized invitations)',
      venueStatusNoteFr: 'L’adresse du domicile est strictement réservée aux invitations autorisées à ce moment familial.',
      venueStatusNoteEn: 'The home address is strictly reserved for invitations authorized for this family gathering.',
      isAddressConfirmed: false,
      isPrivateAddress: true,
      mapUrl: null,
      descriptionFr: 'Une rencontre familiale et chaleureuse pour partager les premières émotions de cette journée et adresser ses vœux aux nouveaux mariés.',
      descriptionEn: 'A warm family gathering to share the first emotions of the day and extend best wishes to the newlyweds.',
      dressCodeFr: 'Une tenue élégante, adaptée à la cérémonie.',
      dressCodeEn: 'Elegant attire suitable for the celebration.',
      notesFr: [],
      notesEn: [],
      updatedAt: now,
    },
    {
      id: 'cocktail',
      sortOrder: 4,
      titleFr: 'Le vin d’honneur et les photos',
      titleEn: 'Cocktail Reception & Photos',
      eventDate: '2026-12-01',
      startTime: null,
      timeLabelFr: 'Horaire à préciser (proposition : 17 h 00 – 19 h 00)',
      timeLabelEn: 'Time to be specified (proposed: 5:00 PM – 7:00 PM)',
      endLabelFr: null,
      endLabelEn: null,
      venueNameFr: 'Lieu à confirmer (piste étudiée : Les Jardins de Simbock)',
      venueNameEn: 'Venue to be confirmed (option under review: Les Jardins de Simbock)',
      addressFr: 'Lieu indépendant à confirmer (piste : quartier Simbock, non loin du rond-point Damas, sous réserve)',
      addressEn: 'Independent venue to be confirmed (option: Simbock near Damas roundabout, subject to confirmation)',
      venueStatusNoteFr: 'Horaire et lieu définitifs à confirmer par les mariés.',
      venueStatusNoteEn: 'Final schedule and venue to be confirmed by the couple.',
      isAddressConfirmed: false,
      isPrivateAddress: false,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Simbock+Rond+Point+Damas+Yaounde',
      descriptionFr: 'Un moment privilégié pour féliciter les mariés, échanger avec les familles et prendre des photos souvenirs.',
      descriptionEn: 'A privileged moment to congratulate the newlyweds, connect with the families, and take keepsake photos.',
      dressCodeFr: 'Tenue élégante et adaptée · Thème Rose & Blanc.',
      dressCodeEn: 'Elegant attire · Pink & White theme.',
      notesFr: [
        'Séance photos souvenirs avec les mariés et les invités.'
      ],
      notesEn: [
        'Keepsake photo session with the couple and guests.'
      ],
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
      venueNameFr: 'Lieu à confirmer (pistes étudiées : Les Jardins de Simbock ou Salle de fête Simbock)',
      venueNameEn: 'Venue to be confirmed (options under review: Les Jardins de Simbock or Salle de fête Simbock)',
      addressFr: 'Lieu de réception à confirmer à Yaoundé',
      addressEn: 'Reception venue in Yaoundé to be confirmed',
      venueStatusNoteFr: 'Le lieu exact de la grande soirée sera confirmé dès validation de la réservation.',
      venueStatusNoteEn: 'The exact venue for the grand soirée will be confirmed upon booking validation.',
      isAddressConfirmed: false,
      isPrivateAddress: true,
      mapUrl: null,
      descriptionFr: 'Une soirée de musique, de danse et de partage pour célébrer l’amour de Joseph et Marie dans une ambiance festive et élégante.',
      descriptionEn: 'An evening of music, dancing, and sharing to celebrate the love of Joseph and Marie in a festive and elegant atmosphere.',
      dressCodeFr: 'Tenue de soirée pour les femmes comme pour les hommes.',
      dressCodeEn: 'Formal evening attire for both women and men.',
      themeLabelFr: 'Rose & Blanc',
      themeLabelEn: 'Pink & White',
      notesFr: [
        'Thème vestimentaire : Rose & Blanc.',
        'Fin de soirée : jusqu’à l’aube.'
      ],
      notesEn: [
        'Dress theme: Pink & White.',
        'Duration: until dawn.'
      ],
      updatedAt: now,
    },
  ];
}

export function getInitialInvitations(): InvitationRecord[] {
  const now = '2026-10-28T10:00:00.000Z';

  // Pre-seeded realistic demonstration tokens matching every scenario in the specification
  const tokClarisse = 'clarisse-eglise-soiree-9x8k2m7p4q1v5n3z';
  const tokAline = 'aline-individuel-soiree-3h7w9b2k5m8p1x4c';
  const tokCouple = 'aline-patrick-couple-complet-6t4r8n2v9j5l1q7w';
  const tokFamille = 'famille-mbarga-complet-5p2m9x4v7k1n8q3r';
  const tokMairieEglise = 'jean-paul-mairie-eglise-2w8k5n9p3x7v1m4q';
  const tokRevoquee = 'invitation-revoquee-test-7m3k9p1x5v2n8q4w';

  return [
    {
      id: 'inv-clarisse-01',
      tokenHash: hashToken(tokClarisse),
      rawTokenForAdminCopy: tokClarisse,
      displayName: 'Madame Clarisse',
      primaryFirstName: 'Clarisse',
      primaryLastName: 'Nkoa',
      secondaryPersonName: '',
      customGreetingFr: 'Chère Madame Clarisse,\nnous serions honorés de vous compter parmi nous, accompagnée de la personne de votre choix.',
      customGreetingEn: 'Dear Mrs. Clarisse,\nwe would be honored to have you among us, accompanied by a guest of your choice.',
      personalNoteFr: 'Au plaisir de partager la bénédiction nuptiale et la grande soirée avec vous.',
      personalNoteEn: 'Looking forward to sharing the nuptial blessing and the grand soirée with you.',
      phone: '+237690000001',
      email: 'clarisse.demo@example.com',
      internalNote: 'Exemple officiel du cahier des charges : Église + Soirée uniquement, 1 accompagnant autorisé (2 places église, 2 places soirée).',
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
        { id: 'p-clarisse-2', personIndex: 1, fullName: 'Accompagnant(e) de Madame Clarisse', isChild: false, isPlusOne: true },
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
      tokenHash: hashToken(tokAline),
      rawTokenForAdminCopy: tokAline,
      displayName: 'Aline',
      primaryFirstName: 'Aline',
      primaryLastName: 'Essomba',
      secondaryPersonName: '',
      customGreetingFr: 'Chère Aline,\nnous serions heureux de vous compter parmi nous.',
      customGreetingEn: 'Dear Aline,\nwe would be delighted to have you among us.',
      personalNoteFr: 'Retrouvons-nous dès 20 h pour célébrer ensemble lors de la grande soirée Rose & Blanc.',
      personalNoteEn: 'Join us at 8:00 PM to celebrate together at the Pink & White grand soirée.',
      phone: '+237670000002',
      email: 'aline.demo@example.com',
      internalNote: 'Invitation individuelle — uniquement Grande Soirée (1 personne, aucun accompagnant).',
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
      responses: [
        { personId: 'p-aline-1', eventId: 'evening', attendance: 'yes' },
      ],
      dietaryNotes: 'Sans arachide',
      accessNeedNotes: '',
      messageToCouple: 'Toutes mes félicitations Joseph et Marie ! Hâte de célébrer avec vous.',
      allowMaybeOption: false,
      respondedAt: '2026-10-28T09:30:00.000Z',
      createdAt: now,
      updatedAt: '2026-10-28T09:30:00.000Z',
    },
    {
      id: 'inv-couple-03',
      tokenHash: hashToken(tokCouple),
      rawTokenForAdminCopy: tokCouple,
      displayName: 'Aline et Patrick',
      primaryFirstName: 'Aline',
      primaryLastName: 'Tchoumi',
      secondaryPersonName: 'Patrick Tchoumi',
      customGreetingFr: 'Chers Aline et Patrick,\nnous serions heureux de partager cette journée avec vous.',
      customGreetingEn: 'Dear Aline and Patrick,\nwe would be delighted to share this day with you.',
      personalNoteFr: 'Capacité personnalisée : 2 places pour la cérémonie religieuse et le vin d’honneur, 1 place pour la soirée.',
      personalNoteEn: 'Custom seating: 2 seats for the religious ceremony and cocktail, 1 seat for the evening.',
      phone: '+237699000003',
      email: 'couple.demo@example.com',
      internalNote: 'Couple nommé avec mode avancé de capacité par événement (Église: 2, Vin d’honneur: 2, Soirée: 1).',
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
      rsvpStatus: 'partial',
      people: [
        { id: 'p-couple-1', personIndex: 0, fullName: 'Aline Tchoumi', isChild: false, isPlusOne: false },
        { id: 'p-couple-2', personIndex: 1, fullName: 'Patrick Tchoumi', isChild: false, isPlusOne: false },
      ],
      responses: [
        { personId: 'p-couple-1', eventId: 'church', attendance: 'yes' },
        { personId: 'p-couple-2', eventId: 'church', attendance: 'yes' },
        { personId: 'p-couple-1', eventId: 'cocktail', attendance: 'yes' },
        { personId: 'p-couple-2', eventId: 'cocktail', attendance: 'yes' },
        { personId: 'p-couple-1', eventId: 'evening', attendance: 'yes' },
        { personId: 'p-couple-2', eventId: 'evening', attendance: 'no' },
      ],
      dietaryNotes: '',
      accessNeedNotes: '',
      messageToCouple: 'Merci pour cette délicate attention, nous serons présents !',
      allowMaybeOption: true,
      respondedAt: '2026-10-28T09:45:00.000Z',
      createdAt: now,
      updatedAt: '2026-10-28T09:45:00.000Z',
    },
    {
      id: 'inv-famille-04',
      tokenHash: hashToken(tokFamille),
      rawTokenForAdminCopy: tokFamille,
      displayName: 'Famille Mbarga',
      primaryFirstName: 'Henri',
      primaryLastName: 'Mbarga',
      secondaryPersonName: 'Chantal Mbarga',
      customGreetingFr: 'Chère famille Mbarga,\nnous avons le plaisir de vous inviter à célébrer notre union.',
      customGreetingEn: 'Dear Mbarga Family,\nwe have the pleasure of inviting you to celebrate our union.',
      personalNoteFr: 'Vous êtes conviés à l’ensemble des moments de notre journée, y compris l’accueil familial à notre domicile de Simbock.',
      personalNoteEn: 'You are invited to all moments of our wedding day, including the family welcome at our home in Simbock.',
      phone: '+237655000004',
      email: 'mbarga.famille@example.com',
      internalNote: 'Famille proche — Accès aux 5 événements (Mairie, Église, Domicile Simbock, Vin d’honneur, Grande Soirée). 2 adultes + 2 enfants.',
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
      tokenHash: hashToken(tokMairieEglise),
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
    {
      id: 'inv-revoked-06',
      tokenHash: hashToken(tokRevoquee),
      rawTokenForAdminCopy: tokRevoquee,
      displayName: 'Invitation Test Révoquée',
      primaryFirstName: 'Marc',
      primaryLastName: 'Test',
      secondaryPersonName: '',
      customGreetingFr: '',
      customGreetingEn: '',
      personalNoteFr: '',
      personalNoteEn: '',
      phone: '',
      email: '',
      internalNote: 'Lien révoqué pour tester la sécurité.',
      invitationType: 'individual',
      maxAdults: 1,
      maxChildren: 0,
      maxTotal: 1,
      capacityMode: 'simple',
      eventAccess: {
        civil: { enabled: false, allowedSeats: 0 },
        church: { enabled: true, allowedSeats: 1 },
        home_reception: { enabled: false, allowedSeats: 0 },
        cocktail: { enabled: false, allowedSeats: 0 },
        evening: { enabled: false, allowedSeats: 0 },
      },
      preferredLang: 'fr',
      rsvpDeadline: null,
      expiresAt: null,
      accessCodeRequired: false,
      accessPin: null,
      status: 'revoked',
      whatsappStatus: 'not_prepared',
      rsvpStatus: 'pending',
      people: [
        { id: 'p-rev-1', personIndex: 0, fullName: 'Marc Test', isChild: false, isPlusOne: false },
      ],
      responses: [],
      dietaryNotes: '',
      accessNeedNotes: '',
      messageToCouple: '',
      allowMaybeOption: false,
      respondedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Pure security boundary function: resolves a guest token and returns ONLY
 * authorized events and guest-safe fields.
 * Used by both the Express API and the automated security test suite.
 */
export function resolveGuestInvitationFromState(
  state: DatabaseState,
  rawToken: string,
  providedPin?: string
):
  | { status: 200; data: GuestInvitationView; invitationId: string }
  | { status: 403; requiresPin: true }
  | { status: 404; error: string } {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 10) {
    return { status: 404, error: 'Invitation introuvable ou indisponible.' };
  }

  const incomingHash = hashToken(rawToken);
  const inv = state.invitations.find((i) => i.tokenHash === incomingHash);

  // Never reveal whether an invitation existed, was revoked, or expired
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

  // Strictly filter events: ONLY events where eventAccess[event.id]?.enabled === true
  const authorizedEvents: AuthorizedGuestEvent[] = state.events
    .filter((ev) => inv.eventAccess[ev.id]?.enabled === true && (inv.eventAccess[ev.id]?.allowedSeats ?? 0) > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((ev) => {
      const seats = Math.min(inv.eventAccess[ev.id].allowedSeats, inv.maxTotal);
      return {
        id: ev.id,
        sortOrder: ev.sortOrder,
        titleFr: ev.titleFr,
        titleEn: ev.titleEn,
        eventDate: ev.eventDate,
        startTime: ev.startTime,
        timeLabelFr: ev.timeLabelFr,
        timeLabelEn: ev.timeLabelEn,
        endLabelFr: ev.endLabelFr,
        endLabelEn: ev.endLabelEn,
        venueNameFr: ev.venueNameFr,
        venueNameEn: ev.venueNameEn,
        addressFr: ev.addressFr,
        addressEn: ev.addressEn,
        venueStatusNoteFr: ev.venueStatusNoteFr,
        venueStatusNoteEn: ev.venueStatusNoteEn,
        isAddressConfirmed: ev.isAddressConfirmed,
        mapUrl: ev.isAddressConfirmed ? ev.mapUrl : null,
        descriptionFr: ev.descriptionFr,
        descriptionEn: ev.descriptionEn,
        dressCodeFr: ev.dressCodeFr,
        dressCodeEn: ev.dressCodeEn,
        themeLabelFr: ev.themeLabelFr,
        themeLabelEn: ev.themeLabelEn,
        notesFr: ev.notesFr,
        notesEn: ev.notesEn,
        updatedAt: ev.updatedAt,
        allowedSeats: seats,
      };
    });

  const authorizedIds = new Set(authorizedEvents.map((e) => e.id));

  // Filter responses to only authorized events
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

/**
 * Pure server-side RSVP validation & save logic.
 * Enforces:
 * - Invitation is active and not past deadline
 * - Cannot respond to an unauthorized event
 * - Cannot exceed maxTotal or per-event allowedSeats
 * - Cannot add a plus-one on an individual invitation
 */
export function validateAndSaveRsvp(
  state: DatabaseState,
  rawToken: string,
  payload: {
    people?: { id: string; fullName: string }[];
    responses: { personId: string; eventId: EventId; attendance: 'yes' | 'no' | 'maybe' }[];
    dietaryNotes?: string;
    accessNeedNotes?: string;
    messageToCouple?: string;
    pin?: string;
  }
): { status: 200; data: GuestInvitationView } | { status: 400 | 403 | 404; error: string } {
  const resolved = resolveGuestInvitationFromState(state, rawToken, payload.pin);
  if (resolved.status === 404) {
    return { status: 404, error: resolved.error };
  }
  if (resolved.status === 403) {
    return { status: 403, error: 'Code de vérification invalide.' };
  }

  const inv = state.invitations.find((i) => i.id === resolved.invitationId)!;

  if (inv.rsvpDeadline) {
    const deadlineMs = new Date(inv.rsvpDeadline).getTime();
    if (!isNaN(deadlineMs) && deadlineMs < Date.now()) {
      return { status: 403, error: 'La date limite de réponse pour cette invitation est dépassée.' };
    }
  }

  if (!Array.isArray(payload.responses)) {
    return { status: 400, error: 'Format de réponse invalide.' };
  }

  // Check people count & names
  if (payload.people) {
    if (payload.people.length > inv.maxTotal) {
      return {
        status: 400,
        error: `Impossible de dépasser la capacité maximale autorisée (${inv.maxTotal} personne(s)).`,
      };
    }
    if (inv.invitationType === 'individual' && payload.people.length > 1) {
      return {
        status: 400,
        error: 'Cette invitation est individuelle et ne permet pas d’ajouter d’accompagnant.',
      };
    }
  }

  const validPersonIds = new Set(inv.people.slice(0, inv.maxTotal).map((p) => p.id));

  // Validate each response entry
  const yesCountsByEvent: Record<string, number> = {};

  for (const r of payload.responses) {
    if (!validPersonIds.has(r.personId)) {
      return { status: 400, error: 'Personne non autorisée sur cette invitation.' };
    }

    const access = inv.eventAccess[r.eventId];
    if (!access || !access.enabled || access.allowedSeats <= 0) {
      return {
        status: 403,
        error: 'Action non autorisée : vous ne pouvez pas répondre pour un événement non inclus dans votre invitation.',
      };
    }

    if (!['yes', 'no', 'maybe'].includes(r.attendance)) {
      return { status: 400, error: 'Choix de présence invalide.' };
    }

    if (r.attendance === 'maybe' && !inv.allowMaybeOption) {
      return { status: 400, error: 'L’option « À confirmer » n’est pas activée pour cette invitation.' };
    }

    if (r.attendance === 'yes') {
      yesCountsByEvent[r.eventId] = (yesCountsByEvent[r.eventId] || 0) + 1;
      const maxForEvent = Math.min(access.allowedSeats, inv.maxTotal);
      if (yesCountsByEvent[r.eventId] > maxForEvent) {
        return {
          status: 400,
          error: `Le nombre de confirmations dépasse la limite autorisée (${maxForEvent} place(s)) pour cet événement.`,
        };
      }
    }
  }

  // Update person names if allowed (e.g. plus_one or family member names)
  if (payload.people) {
    for (const incomingPerson of payload.people) {
      const target = inv.people.find((p) => p.id === incomingPerson.id);
      if (target && typeof incomingPerson.fullName === 'string' && incomingPerson.fullName.trim()) {
        target.fullName = incomingPerson.fullName.trim().slice(0, 120);
      }
    }
  }

  // Idempotent upsert of responses
  const updatedResponsesMap = new Map<string, PersonEventResponse>();
  for (const existing of inv.responses) {
    updatedResponsesMap.set(`${existing.personId}:${existing.eventId}`, existing);
  }
  for (const incoming of payload.responses) {
    updatedResponsesMap.set(`${incoming.personId}:${incoming.eventId}`, {
      personId: incoming.personId,
      eventId: incoming.eventId,
      attendance: incoming.attendance,
    });
  }

  inv.responses = Array.from(updatedResponsesMap.values());
  inv.dietaryNotes = (payload.dietaryNotes ?? inv.dietaryNotes ?? '').trim().slice(0, 500);
  inv.accessNeedNotes = (payload.accessNeedNotes ?? inv.accessNeedNotes ?? '').trim().slice(0, 500);
  inv.messageToCouple = (payload.messageToCouple ?? inv.messageToCouple ?? '').trim().slice(0, 1000);

  // Compute global RSVP status
  const activeResponses = inv.responses.filter((r) => inv.eventAccess[r.eventId]?.enabled);
  const hasYes = activeResponses.some((r) => r.attendance === 'yes');
  const hasNo = activeResponses.some((r) => r.attendance === 'no');
  const hasMaybe = activeResponses.some((r) => r.attendance === 'maybe');

  let newStatus: RsvpGlobalStatus = 'pending';
  if (hasYes && !hasNo && !hasMaybe) {
    newStatus = 'accepted';
  } else if (hasYes && (hasNo || hasMaybe)) {
    newStatus = 'partial';
  } else if (!hasYes && hasMaybe) {
    newStatus = 'pending';
  } else if (!hasYes && hasNo) {
    newStatus = 'declined';
  }

  inv.rsvpStatus = newStatus;
  const nowIso = new Date().toISOString();
  inv.respondedAt = nowIso;
  inv.updatedAt = nowIso;

  // If guest left a message to couple, also sync or add to wishes if not already present
  if (inv.messageToCouple) {
    const existingWish = state.wishes.find((w) => w.invitationId === inv.id);
    if (existingWish) {
      existingWish.message = inv.messageToCouple;
      existingWish.authorName = inv.displayName;
    } else {
      state.wishes.unshift({
        id: `wish-${crypto.randomUUID().slice(0, 8)}`,
        invitationId: inv.id,
        authorName: inv.displayName,
        message: inv.messageToCouple,
        isPublicWish: true,
        moderationStatus: 'pending',
        createdAt: nowIso,
      });
    }
  }

  const refreshed = resolveGuestInvitationFromState(state, rawToken, payload.pin);
  if (refreshed.status !== 200) {
    return { status: 400, error: 'Erreur lors de la mise à jour.' };
  }
  return { status: 200, data: refreshed.data };
}

/**
 * Generates an RFC 5545 .ics calendar file containing ONLY the guest's authorized events
 * in Africa/Douala timezone. Handles events without explicit end time ("jusqu'à l'aube")
 * cleanly without inventing a fake 06:00 AM end time.
 */
export function generateAuthorizedIcs(
  authorizedEvents: AuthorizedGuestEvent[],
  lang: 'fr' | 'en',
  onlyEventId?: EventId
): string {
  const eventsToExport = onlyEventId
    ? authorizedEvents.filter((e) => e.id === onlyEventId)
    : authorizedEvents;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Joseph et Marie//Mariage 1er Decembre 2026//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Mariage Joseph & Marie (1er Décembre 2026)',
    'X-WR-TIMEZONE:Africa/Douala',
  ];

  const dtStamp = '20261028T100000Z';

  for (const ev of eventsToExport) {
    const title = lang === 'fr' ? ev.titleFr : ev.titleEn;
    const venue = lang === 'fr' ? ev.venueNameFr : ev.venueNameEn;
    const address = lang === 'fr' ? ev.addressFr : ev.addressEn;
    const desc = lang === 'fr' ? ev.descriptionFr : ev.descriptionEn;
    const dress = lang === 'fr' ? ev.dressCodeFr : ev.dressCodeEn;
    const timeNote = lang === 'fr' ? ev.timeLabelFr : ev.timeLabelEn;
    const endNote = lang === 'fr' ? ev.endLabelFr : ev.endLabelEn;

    const fullDescription = [
      desc,
      `Horaire : ${timeNote}${endNote ? ` (${endNote})` : ''}`,
      `Tenue : ${dress}`,
      `Lieu : ${venue} — ${address}`,
    ]
      .join('\\n')
      .replace(/,/g, '\\,');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:jm-20261201-${ev.id}@josephetmarie.cm`);
    lines.push(`DTSTAMP:${dtStamp}`);

    if (ev.startTime) {
      const [hh, mm] = ev.startTime.split(':');
      // Use DTSTART with Africa/Douala TZID and NO invented DTEND
      lines.push(`DTSTART;TZID=Africa/Douala:20261201T${hh}${mm}00`);
    } else {
      // Event without fixed start hour (e.g. home reception after church, or cocktail pending hour)
      lines.push('DTSTART;VALUE=DATE:20261201');
    }

    lines.push(`SUMMARY:Joseph & Marie — ${title}`);
    lines.push(`LOCATION:${venue.replace(/,/g, '\\,')}`);
    lines.push(`DESCRIPTION:${fullDescription}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

const DATA_FILE_PATH = path.resolve(process.cwd(), '.wedding-data.json');

export function loadDatabaseState(): DatabaseState {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseState;
      if (parsed && Array.isArray(parsed.events) && Array.isArray(parsed.invitations)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading persisted state, initializing default state:', err);
  }

  const initialState: DatabaseState = {
    events: getInitialEvents(),
    invitations: getInitialInvitations(),
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
        details: 'Initialisation des 5 événements et des invitations de démonstration sécurisées.',
        createdAt: '2026-10-28T08:00:00.000Z',
      },
    ],
  };

  saveDatabaseState(initialState);
  return initialState;
}

export function saveDatabaseState(state: DatabaseState): void {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist local state:', err);
  }
  // Synchronize asynchronously to Sanity.io (project rpzi1x95)
  saveStateToSanity(state).catch((err) => {
    console.error('Sanity background sync error:', err);
  });
}
