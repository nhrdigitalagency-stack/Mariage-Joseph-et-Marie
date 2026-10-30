export type EventId = 'civil' | 'church' | 'home_reception' | 'cocktail' | 'evening';

export type InvitationType = 'individual' | 'couple' | 'plus_one' | 'family';

export type InvitationStatus = 'draft' | 'active' | 'revoked';

export type RsvpGlobalStatus = 'pending' | 'accepted' | 'declined' | 'partial';

export type AttendanceChoice = 'yes' | 'no' | 'maybe';

export type CapacityMode = 'simple' | 'advanced';

export type WhatsAppSendState = 'not_prepared' | 'prepared' | 'declared_sent';

export type AdminRole = 'super_admin' | 'invitation_manager' | 'memory_moderator';

export interface WeddingEventConfig {
  id: EventId;
  sortOrder: number;
  titleFr: string;
  titleEn: string;
  eventDate: string; // '2026-12-01'
  startTime: string | null; // '11:30', '14:30', '20:00', or null
  timeLabelFr: string;
  timeLabelEn: string;
  endLabelFr: string | null;
  endLabelEn: string | null;
  venueNameFr: string;
  venueNameEn: string;
  addressFr: string;
  addressEn: string;
  venueStatusNoteFr?: string;
  venueStatusNoteEn?: string;
  isAddressConfirmed: boolean;
  isPrivateAddress: boolean;
  mapUrl: string | null;
  descriptionFr: string;
  descriptionEn: string;
  dressCodeFr: string;
  dressCodeEn: string;
  themeLabelFr?: string;
  themeLabelEn?: string;
  notesFr: string[];
  notesEn: string[];
  updatedAt: string;
}

export interface AuthorizedGuestEvent extends Omit<WeddingEventConfig, 'isPrivateAddress'> {
  allowedSeats: number;
}

export interface InvitationPerson {
  id: string;
  personIndex: number;
  fullName: string;
  isChild: boolean;
  isPlusOne: boolean;
}

export interface PersonEventResponse {
  personId: string;
  eventId: EventId;
  attendance: AttendanceChoice;
}

export interface InvitationRecord {
  id: string;
  tokenHash: string;
  rawTokenForAdminCopy: string;
  displayName: string;
  primaryFirstName: string;
  primaryLastName: string;
  secondaryPersonName: string;
  customGreetingFr: string;
  customGreetingEn: string;
  personalNoteFr: string;
  personalNoteEn: string;
  phone: string;
  email: string;
  internalNote: string;
  invitationType: InvitationType;
  maxAdults: number;
  maxChildren: number;
  maxTotal: number;
  capacityMode: CapacityMode;
  eventAccess: Record<EventId, { enabled: boolean; allowedSeats: number }>;
  preferredLang: 'fr' | 'en';
  rsvpDeadline: string | null;
  expiresAt: string | null;
  accessCodeRequired: boolean;
  accessPin: string | null;
  status: InvitationStatus;
  whatsappStatus: WhatsAppSendState;
  rsvpStatus: RsvpGlobalStatus;
  people: InvitationPerson[];
  responses: PersonEventResponse[];
  dietaryNotes: string;
  accessNeedNotes: string;
  messageToCouple: string;
  allowMaybeOption: boolean;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Filtered Guest Payload returned by GET /api/invitation/:token
 * NEVER contains internalNote, unauthorized events, or other guests' info.
 */
export interface GuestInvitationView {
  invitationId: string;
  displayName: string;
  invitationType: InvitationType;
  primaryFirstName: string;
  primaryLastName: string;
  secondaryPersonName: string;
  customGreetingFr: string;
  customGreetingEn: string;
  personalNoteFr: string;
  personalNoteEn: string;
  maxAdults: number;
  maxChildren: number;
  maxTotal: number;
  capacityMode: CapacityMode;
  preferredLang: 'fr' | 'en';
  rsvpDeadline: string | null;
  rsvpStatus: RsvpGlobalStatus;
  allowMaybeOption: boolean;
  authorizedEvents: AuthorizedGuestEvent[];
  people: InvitationPerson[];
  responses: PersonEventResponse[];
  dietaryNotes: string;
  accessNeedNotes: string;
  messageToCouple: string;
  respondedAt: string | null;
  updatedAt: string;
}

export interface GuestWishMessage {
  id: string;
  invitationId: string | null;
  authorName: string;
  message: string;
  isPublicWish: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface SharedMemoryPhoto {
  id: string;
  invitationId: string | null;
  eventId: EventId | null; // null = common album
  contributorName: string;
  dataUrl: string; // Stripped of EXIF/GPS metadata via canvas re-encoding
  caption: string;
  visibilityScope: 'common' | 'event';
  consentGiven: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorRole: AdminRole;
  actorLabel: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}
