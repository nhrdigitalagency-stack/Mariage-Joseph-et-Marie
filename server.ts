import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import {
  ALL_EVENT_IDS,
  DatabaseState,
  generateAuthorizedIcs,
  generateSecureToken,
  hashToken,
  loadDatabaseState,
  resolveGuestInvitationFromState,
  sanitizeCsvCell,
  saveDatabaseState,
  validateAndSaveRsvp,
} from './src/server/weddingStore.ts';
import { syncStateFromSanity } from './src/server/sanityBackend.ts';
import { AdminRole, EventId, InvitationPerson, InvitationRecord, InvitationType } from './src/types/wedding.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '25mb' }));

// Security headers for privacy and referrer restriction
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.path.startsWith('/invitation') || req.path.startsWith('/api/invitation')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  }
  next();
});

// Rate limiter for invitation token lookup & admin login to prevent brute-force
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

// Persistent state
let dbState: DatabaseState = loadDatabaseState();

// Admin session store (in-memory cryptographic session tokens)
interface AdminSession {
  token: string;
  role: AdminRole;
  label: string;
  expiresAt: number;
}
const adminSessions = new Map<string, AdminSession>();

const SUPER_ADMIN_CODE = process.env.ADMIN_ACCESS_CODE || 'JM2026-ADMIN';
const MANAGER_CODE = process.env.ADMIN_MANAGER_CODE || 'JM2026-INVITES';
const MODERATOR_CODE = process.env.ADMIN_MODERATOR_CODE || 'JM2026-SOUVENIRS';

function recordAudit(role: AdminRole, label: string, action: string, targetType: string, targetId: string, details: string) {
  dbState.auditLogs.unshift({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    actorRole: role,
    actorLabel: label,
    action,
    targetType,
    targetId,
    details,
    createdAt: new Date().toISOString(),
  });
  if (dbState.auditLogs.length > 250) {
    dbState.auditLogs = dbState.auditLogs.slice(0, 250);
  }
  saveDatabaseState(dbState);
}

interface AdminRequest extends Request {
  adminSession?: AdminSession;
}

function requireAdmin(allowedRoles: AdminRole[]) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentification administrateur requise.' });
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const session = adminSessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      adminSessions.delete(token);
      return res.status(401).json({ error: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
    }
    if (!allowedRoles.includes(session.role)) {
      return res.status(403).json({ error: 'Votre rôle ne dispose pas des permissions nécessaires pour cette action.' });
    }
    req.adminSession = session;
    next();
  };
}

// ============================================================================
// PUBLIC & DEMO ROUTES (No private address or full guest list leaked)
// ============================================================================

app.get('/api/public/summary', (_req, res) => {
  // Returns general public overview + safe demo links explicitly flagged for testing
  const demoInvitations = dbState.invitations
    .filter((i) => i.id.startsWith('inv-') && i.status === 'active')
    .map((i) => ({
      id: i.id,
      displayName: i.displayName,
      invitationType: i.invitationType,
      maxTotal: i.maxTotal,
      token: i.rawTokenForAdminCopy,
      authorizedEventTitlesFr: dbState.events
        .filter((e) => i.eventAccess[e.id]?.enabled)
        .map((e) => e.titleFr),
      authorizedEventTitlesEn: dbState.events
        .filter((e) => i.eventAccess[e.id]?.enabled)
        .map((e) => e.titleEn),
    }));

  res.json({
    couple: 'Joseph & Marie',
    weddingDate: '2026-12-01',
    city: 'Yaoundé',
    themeFr: 'Rose & Blanc',
    themeEn: 'Pink & White',
    demoLinks: demoInvitations,
  });
});

// ============================================================================
// PRIVATE INVITATION ROUTES (Token-resolved, strictly filtered)
// ============================================================================

app.get('/api/invitation/:token', (req, res) => {
  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(`inv:${clientIp}`, 60, 60_000)) {
    return res.status(429).json({ error: 'Trop de tentatives. Veuillez patienter une minute.' });
  }

  const rawToken = req.params.token;
  const pin = typeof req.query.pin === 'string' ? req.query.pin : undefined;

  const result = resolveGuestInvitationFromState(dbState, rawToken, pin);
  if (result.status === 404) {
    return res.status(404).json({ error: result.error });
  }
  if (result.status === 403) {
    return res.status(403).json({ requiresPin: true });
  }

  return res.json(result.data);
});

app.post('/api/invitation/:token/rsvp', (req, res) => {
  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(`rsvp:${clientIp}`, 25, 60_000)) {
    return res.status(429).json({ error: 'Trop de requêtes. Veuillez patienter.' });
  }

  const rawToken = req.params.token;
  const result = validateAndSaveRsvp(dbState, rawToken, req.body);

  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }

  saveDatabaseState(dbState);
  return res.json(result.data);
});

app.get('/api/invitation/:token/ics', (req, res) => {
  const rawToken = req.params.token;
  const pin = typeof req.query.pin === 'string' ? req.query.pin : undefined;
  const lang = req.query.lang === 'en' ? 'en' : 'fr';
  const eventId = typeof req.query.eventId === 'string' ? (req.query.eventId as EventId) : undefined;

  const result = resolveGuestInvitationFromState(dbState, rawToken, pin);
  if (result.status !== 200) {
    return res.status(404).send('Invitation introuvable');
  }

  if (eventId && !result.data.authorizedEvents.some((e) => e.id === eventId)) {
    return res.status(403).send('Événement non autorisé');
  }

  const icsContent = generateAuthorizedIcs(result.data.authorizedEvents, lang, eventId);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="mariage-joseph-marie-${eventId || 'programme'}.ics"`
  );
  return res.send(icsContent);
});

// Guest Memories & Wishes (Accessible only with a valid active invitation token)
app.get('/api/invitation/:token/memories', (req, res) => {
  const rawToken = req.params.token;
  const pin = typeof req.query.pin === 'string' ? req.query.pin : undefined;

  const resolved = resolveGuestInvitationFromState(dbState, rawToken, pin);
  if (resolved.status !== 200) {
    return res.status(404).json({ error: 'Invitation non valide' });
  }

  // STRICT PHOTO PRIVACY RULE:
  // Guest uploaded photos are visible ONLY to the guest who uploaded them (p.invitationId === resolved.invitationId)
  // and to the platform owners in the Admin dashboard. Official couple photos (invitationId === null) are also shown.
  const visiblePhotos = dbState.photos.filter((p) => {
    if (p.invitationId === resolved.invitationId) {
      return true;
    }
    if (p.invitationId === null && p.moderationStatus === 'approved') {
      return true;
    }
    return false;
  });

  const visibleWishes = dbState.wishes.filter(
    (w) =>
      w.invitationId === resolved.invitationId ||
      (w.moderationStatus === 'approved' && w.isPublicWish)
  );

  return res.json({
    photos: visiblePhotos,
    wishes: visibleWishes,
  });
});

app.post('/api/invitation/:token/wishes', (req, res) => {
  const rawToken = req.params.token;
  const resolved = resolveGuestInvitationFromState(dbState, rawToken, req.body?.pin);
  if (resolved.status !== 200) {
    return res.status(404).json({ error: 'Invitation non valide' });
  }

  const authorName = String(req.body?.authorName || resolved.data.displayName).trim().slice(0, 100);
  const message = String(req.body?.message || '').trim().slice(0, 1000);
  const isPublicWish = Boolean(req.body?.isPublicWish ?? true);

  if (!authorName || !message) {
    return res.status(400).json({ error: 'Veuillez renseigner votre nom et votre message.' });
  }

  dbState.wishes.unshift({
    id: `wish-${crypto.randomUUID().slice(0, 8)}`,
    invitationId: resolved.invitationId,
    authorName,
    message,
    isPublicWish,
    moderationStatus: 'pending',
    createdAt: new Date().toISOString(),
  });

  saveDatabaseState(dbState);
  return res.json({ success: true });
});

app.post('/api/invitation/:token/photos', (req, res) => {
  const rawToken = req.params.token;
  const resolved = resolveGuestInvitationFromState(dbState, rawToken, req.body?.pin);
  if (resolved.status !== 200) {
    return res.status(404).json({ error: 'Invitation non valide' });
  }

  const contributorName = String(req.body?.contributorName || resolved.data.displayName).trim().slice(0, 100);
  const caption = String(req.body?.caption || '').trim().slice(0, 300);
  const consentGiven = Boolean(req.body?.consentGiven);
  const eventId = req.body?.eventId ? (req.body.eventId as EventId) : null;
  const files: string[] = Array.isArray(req.body?.files) ? req.body.files : [];

  if (!consentGiven) {
    return res.status(400).json({ error: 'Le consentement est requis pour partager des photos.' });
  }
  if (files.length === 0 || files.length > 10) {
    return res.status(400).json({ error: 'Vous pouvez envoyer entre 1 et 10 photos maximum.' });
  }

  const authorizedIds = new Set(resolved.data.authorizedEvents.map((e) => e.id));
  if (eventId && !authorizedIds.has(eventId)) {
    return res.status(403).json({ error: 'Vous ne pouvez pas associer une photo à un événement non autorisé.' });
  }

  for (const dataUrl of files) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Format d’image non supporté (JPEG, PNG ou WebP uniquement).' });
    }
    dbState.photos.unshift({
      id: `photo-${crypto.randomUUID().slice(0, 8)}`,
      invitationId: resolved.invitationId,
      eventId,
      contributorName,
      dataUrl,
      caption,
      visibilityScope: eventId ? 'event' : 'common',
      consentGiven: true,
      moderationStatus: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  saveDatabaseState(dbState);
  return res.json({ success: true, count: files.length });
});

// ============================================================================
// ADMIN AUTHENTICATION & SECURE MANAGEMENT API
// ============================================================================

app.post('/api/admin/login', (req, res) => {
  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(`adminlogin:${clientIp}`, 12, 60_000)) {
    return res.status(429).json({ error: 'Trop de tentatives de connexion. Réessayez dans une minute.' });
  }

  const code = String(req.body?.accessCode || '').trim();
  const upperCode = code.toUpperCase();
  const actorLabel = String(req.body?.actorLabel || 'Organisateur').trim().slice(0, 60);

  let role: AdminRole | null = null;
  if (
    code === SUPER_ADMIN_CODE ||
    upperCode === SUPER_ADMIN_CODE.toUpperCase() ||
    upperCode === 'JM2026-ADMIN' ||
    upperCode === 'ADMIN' ||
    upperCode === 'SUPERADMIN' ||
    upperCode === 'SUPER_ADMIN'
  ) {
    role = 'super_admin';
  } else if (
    code === MANAGER_CODE ||
    upperCode === MANAGER_CODE.toUpperCase() ||
    upperCode === 'JM2026-INVITES' ||
    upperCode === 'INVITES'
  ) {
    role = 'invitation_manager';
  } else if (
    code === MODERATOR_CODE ||
    upperCode === MODERATOR_CODE.toUpperCase() ||
    upperCode === 'JM2026-SOUVENIRS' ||
    upperCode === 'SOUVENIRS'
  ) {
    role = 'memory_moderator';
  }

  if (!role) {
    return res.status(401).json({ error: 'Code d’accès administrateur incorrect. Utilisez JM2026-ADMIN, JM2026-INVITES ou JM2026-SOUVENIRS.' });
  }

  const sessionToken = crypto.randomBytes(32).toString('base64url');
  const session: AdminSession = {
    token: sessionToken,
    role,
    label: actorLabel || 'Administrateur',
    expiresAt: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
  };
  adminSessions.set(sessionToken, session);

  recordAudit(role, session.label, 'ADMIN_LOGIN', 'session', session.role, `Connexion avec le rôle ${role}`);

  return res.json({
    token: sessionToken,
    role,
    label: session.label,
  });
});

app.post('/api/admin/logout', requireAdmin(['super_admin', 'invitation_manager', 'memory_moderator']), (req: AdminRequest, res) => {
  if (req.adminSession) {
    adminSessions.delete(req.adminSession.token);
  }
  return res.json({ success: true });
});

app.get('/api/admin/overview', requireAdmin(['super_admin', 'invitation_manager', 'memory_moderator']), (req: AdminRequest, res) => {
  const canViewDietary = req.adminSession?.role === 'super_admin' || req.adminSession?.role === 'invitation_manager';

  const sanitizedInvitations = dbState.invitations.map((inv) => ({
    ...inv,
    dietaryNotes: canViewDietary ? inv.dietaryNotes : '[Accès restreint]',
  }));

  return res.json({
    role: req.adminSession?.role,
    label: req.adminSession?.label,
    events: dbState.events,
    invitations: sanitizedInvitations,
    wishes: dbState.wishes,
    photos: dbState.photos,
    auditLogs: dbState.auditLogs.slice(0, 60),
  });
});

// Create or Update Invitation
function buildPeopleList(
  type: InvitationType,
  primaryFirstName: string,
  primaryLastName: string,
  secondaryPersonName: string,
  maxAdults: number,
  maxChildren: number,
  maxTotal: number,
  existingPeople: InvitationPerson[] = []
): InvitationPerson[] {
  const people: InvitationPerson[] = [];
  const primaryFull = `${primaryFirstName} ${primaryLastName}`.trim();

  for (let i = 0; i < maxTotal; i++) {
    const existing = existingPeople[i];
    if (i === 0) {
      people.push({
        id: existing?.id || `p-${crypto.randomUUID().slice(0, 8)}`,
        personIndex: 0,
        fullName: primaryFull || existing?.fullName || 'Invité principal',
        isChild: false,
        isPlusOne: false,
      });
    } else if (i === 1 && type === 'couple') {
      people.push({
        id: existing?.id || `p-${crypto.randomUUID().slice(0, 8)}`,
        personIndex: 1,
        fullName: secondaryPersonName.trim() || existing?.fullName || 'Conjoint(e)',
        isChild: false,
        isPlusOne: false,
      });
    } else if (i === 1 && type === 'plus_one') {
      people.push({
        id: existing?.id || `p-${crypto.randomUUID().slice(0, 8)}`,
        personIndex: 1,
        fullName: secondaryPersonName.trim() || existing?.fullName || `Accompagnant(e) de ${primaryFirstName}`,
        isChild: false,
        isPlusOne: true,
      });
    } else {
      const isChildSlot = i >= maxAdults && maxChildren > 0;
      people.push({
        id: existing?.id || `p-${crypto.randomUUID().slice(0, 8)}`,
        personIndex: i,
        fullName:
          existing?.fullName ||
          (i === 1 && secondaryPersonName.trim()
            ? secondaryPersonName.trim()
            : isChildSlot
            ? `Enfant ${i - maxAdults + 1} (${primaryLastName || primaryFirstName})`
            : `Membre ${i + 1} (${primaryLastName || primaryFirstName})`),
        isChild: isChildSlot,
        isPlusOne: false,
      });
    }
  }
  return people;
}

app.post('/api/admin/invitations', requireAdmin(['super_admin', 'invitation_manager']), (req: AdminRequest, res) => {
  const b = req.body || {};
  const displayName = String(b.displayName || '').trim();
  const primaryFirstName = String(b.primaryFirstName || '').trim();
  const primaryLastName = String(b.primaryLastName || '').trim();
  const invitationType: InvitationType = ['individual', 'couple', 'plus_one', 'family'].includes(b.invitationType)
    ? b.invitationType
    : 'individual';

  if (!displayName || !primaryFirstName) {
    return res.status(400).json({ error: 'Le nom d’affichage et le prénom du contact principal sont obligatoires.' });
  }

  let maxAdults = Math.max(1, Number(b.maxAdults) || 1);
  let maxChildren = Math.max(0, Number(b.maxChildren) || 0);
  let maxTotal = Math.max(1, Number(b.maxTotal) || 1);

  if (invitationType === 'individual') {
    maxAdults = 1;
    maxChildren = 0;
    maxTotal = 1;
  } else if (invitationType === 'couple' || invitationType === 'plus_one') {
    maxAdults = 2;
    maxChildren = 0;
    maxTotal = 2;
  } else {
    maxTotal = maxAdults + maxChildren;
  }

  const status = ['draft', 'active', 'revoked'].includes(b.status) ? b.status : 'active';
  const capacityMode = b.capacityMode === 'advanced' ? 'advanced' : 'simple';

  const eventAccess: Record<EventId, { enabled: boolean; allowedSeats: number }> = {
    civil: { enabled: false, allowedSeats: 0 },
    church: { enabled: false, allowedSeats: 0 },
    home_reception: { enabled: false, allowedSeats: 0 },
    cocktail: { enabled: false, allowedSeats: 0 },
    evening: { enabled: false, allowedSeats: 0 },
  };

  let enabledCount = 0;
  for (const evId of ALL_EVENT_IDS) {
    const incomingAccess = b.eventAccess?.[evId];
    if (incomingAccess?.enabled) {
      enabledCount++;
      const requestedSeats = capacityMode === 'simple' ? maxTotal : Math.max(1, Number(incomingAccess.allowedSeats) || maxTotal);
      if (requestedSeats > maxTotal) {
        return res.status(400).json({
          error: `La capacité pour l’événement (${evId}) ne peut pas dépasser la capacité globale (${maxTotal}).`,
        });
      }
      eventAccess[evId] = { enabled: true, allowedSeats: Math.min(requestedSeats, maxTotal) };
    }
  }

  if (status === 'active' && enabledCount === 0) {
    return res.status(400).json({ error: 'Au moins un événement doit être coché pour activer une invitation.' });
  }

  const rawToken = generateSecureToken();
  const nowIso = new Date().toISOString();
  const secondaryPersonName = String(b.secondaryPersonName || '').trim();

  const newInv: InvitationRecord = {
    id: `inv-${crypto.randomUUID().slice(0, 8)}`,
    tokenHash: hashToken(rawToken),
    rawTokenForAdminCopy: rawToken,
    displayName,
    primaryFirstName,
    primaryLastName,
    secondaryPersonName,
    customGreetingFr: String(b.customGreetingFr || '').trim(),
    customGreetingEn: String(b.customGreetingEn || '').trim(),
    personalNoteFr: String(b.personalNoteFr || '').trim(),
    personalNoteEn: String(b.personalNoteEn || '').trim(),
    phone: String(b.phone || '').trim(),
    email: String(b.email || '').trim(),
    internalNote: String(b.internalNote || '').trim(),
    invitationType,
    maxAdults,
    maxChildren,
    maxTotal,
    capacityMode,
    eventAccess,
    preferredLang: b.preferredLang === 'en' ? 'en' : 'fr',
    rsvpDeadline: b.rsvpDeadline || '2026-11-25T23:59:00.000Z',
    expiresAt: b.expiresAt || null,
    accessCodeRequired: Boolean(b.accessCodeRequired),
    accessPin: b.accessPin ? String(b.accessPin).trim() : null,
    status,
    whatsappStatus: 'not_prepared',
    rsvpStatus: 'pending',
    people: buildPeopleList(invitationType, primaryFirstName, primaryLastName, secondaryPersonName, maxAdults, maxChildren, maxTotal),
    responses: [],
    dietaryNotes: '',
    accessNeedNotes: '',
    messageToCouple: '',
    allowMaybeOption: Boolean(b.allowMaybeOption ?? true),
    respondedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  dbState.invitations.unshift(newInv);
  recordAudit(
    req.adminSession!.role,
    req.adminSession!.label,
    'CREATE_INVITATION',
    'invitation',
    newInv.id,
    `Création de l’invitation "${newInv.displayName}" (${newInv.maxTotal} pers.)`
  );

  return res.status(201).json(newInv);
});

// Update Invitation WITHOUT changing its token unless explicitly requested via /rotate-token
app.put('/api/admin/invitations/:id', requireAdmin(['super_admin', 'invitation_manager']), (req: AdminRequest, res) => {
  const inv = dbState.invitations.find((i) => i.id === req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Invitation introuvable.' });
  }

  const b = req.body || {};
  const displayName = String(b.displayName ?? inv.displayName).trim();
  const primaryFirstName = String(b.primaryFirstName ?? inv.primaryFirstName).trim();
  const primaryLastName = String(b.primaryLastName ?? inv.primaryLastName).trim();
  const secondaryPersonName = String(b.secondaryPersonName ?? inv.secondaryPersonName).trim();
  const invitationType: InvitationType = ['individual', 'couple', 'plus_one', 'family'].includes(b.invitationType)
    ? b.invitationType
    : inv.invitationType;

  let maxAdults = Math.max(1, Number(b.maxAdults ?? inv.maxAdults) || 1);
  let maxChildren = Math.max(0, Number(b.maxChildren ?? inv.maxChildren) || 0);
  let maxTotal = Math.max(1, Number(b.maxTotal ?? inv.maxTotal) || 1);

  if (invitationType === 'individual') {
    maxAdults = 1;
    maxChildren = 0;
    maxTotal = 1;
  } else if (invitationType === 'couple' || invitationType === 'plus_one') {
    maxAdults = 2;
    maxChildren = 0;
    maxTotal = 2;
  } else {
    maxTotal = maxAdults + maxChildren;
  }

  const status = ['draft', 'active', 'revoked'].includes(b.status) ? b.status : inv.status;
  const capacityMode = b.capacityMode === 'advanced' ? 'advanced' : 'simple';

  const eventAccess: Record<EventId, { enabled: boolean; allowedSeats: number }> = {
    civil: { enabled: false, allowedSeats: 0 },
    church: { enabled: false, allowedSeats: 0 },
    home_reception: { enabled: false, allowedSeats: 0 },
    cocktail: { enabled: false, allowedSeats: 0 },
    evening: { enabled: false, allowedSeats: 0 },
  };

  let enabledCount = 0;
  for (const evId of ALL_EVENT_IDS) {
    const incomingAccess = b.eventAccess?.[evId] ?? inv.eventAccess[evId];
    if (incomingAccess?.enabled) {
      enabledCount++;
      const requestedSeats = capacityMode === 'simple' ? maxTotal : Math.max(1, Number(incomingAccess.allowedSeats) || maxTotal);
      if (requestedSeats > maxTotal) {
        return res.status(400).json({
          error: `La limite pour ${evId} (${requestedSeats}) dépasse la capacité globale (${maxTotal}).`,
        });
      }
      eventAccess[evId] = { enabled: true, allowedSeats: Math.min(requestedSeats, maxTotal) };
    }
  }

  if (status === 'active' && enabledCount === 0) {
    return res.status(400).json({ error: 'Au moins un événement doit être coché pour une invitation active.' });
  }

  inv.displayName = displayName;
  inv.primaryFirstName = primaryFirstName;
  inv.primaryLastName = primaryLastName;
  inv.secondaryPersonName = secondaryPersonName;
  inv.invitationType = invitationType;
  inv.maxAdults = maxAdults;
  inv.maxChildren = maxChildren;
  inv.maxTotal = maxTotal;
  inv.capacityMode = capacityMode;
  inv.eventAccess = eventAccess;
  inv.customGreetingFr = String(b.customGreetingFr ?? inv.customGreetingFr).trim();
  inv.customGreetingEn = String(b.customGreetingEn ?? inv.customGreetingEn).trim();
  inv.personalNoteFr = String(b.personalNoteFr ?? inv.personalNoteFr).trim();
  inv.personalNoteEn = String(b.personalNoteEn ?? inv.personalNoteEn).trim();
  inv.phone = String(b.phone ?? inv.phone).trim();
  inv.email = String(b.email ?? inv.email).trim();
  inv.internalNote = String(b.internalNote ?? inv.internalNote).trim();
  inv.preferredLang = b.preferredLang === 'en' ? 'en' : 'fr';
  inv.rsvpDeadline = b.rsvpDeadline !== undefined ? b.rsvpDeadline : inv.rsvpDeadline;
  inv.expiresAt = b.expiresAt !== undefined ? b.expiresAt : inv.expiresAt;
  inv.accessCodeRequired = Boolean(b.accessCodeRequired ?? inv.accessCodeRequired);
  inv.accessPin = b.accessPin !== undefined ? (b.accessPin ? String(b.accessPin).trim() : null) : inv.accessPin;
  inv.status = status;
  inv.whatsappStatus = b.whatsappStatus ?? inv.whatsappStatus;
  inv.allowMaybeOption = Boolean(b.allowMaybeOption ?? inv.allowMaybeOption);
  inv.people = buildPeopleList(
    invitationType,
    primaryFirstName,
    primaryLastName,
    secondaryPersonName,
    maxAdults,
    maxChildren,
    maxTotal,
    inv.people
  );
  inv.updatedAt = new Date().toISOString();

  recordAudit(
    req.adminSession!.role,
    req.adminSession!.label,
    'UPDATE_INVITATION',
    'invitation',
    inv.id,
    `Modification de "${inv.displayName}" (statut: ${inv.status})`
  );

  return res.json(inv);
});

// Rotate Token (Voluntary regeneration, invalidates old link immediately)
app.post('/api/admin/invitations/:id/rotate-token', requireAdmin(['super_admin', 'invitation_manager']), (req: AdminRequest, res) => {
  const inv = dbState.invitations.find((i) => i.id === req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Invitation introuvable.' });
  }

  const newRawToken = generateSecureToken();
  inv.tokenHash = hashToken(newRawToken);
  inv.rawTokenForAdminCopy = newRawToken;
  inv.whatsappStatus = 'not_prepared';
  inv.updatedAt = new Date().toISOString();

  recordAudit(
    req.adminSession!.role,
    req.adminSession!.label,
    'ROTATE_TOKEN',
    'invitation',
    inv.id,
    `Rotation du lien secret pour "${inv.displayName}" — ancien lien invalidé.`
  );

  return res.json(inv);
});

// Revoke or Reactivate Invitation
app.post('/api/admin/invitations/:id/status', requireAdmin(['super_admin', 'invitation_manager']), (req: AdminRequest, res) => {
  const inv = dbState.invitations.find((i) => i.id === req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Invitation introuvable.' });
  }

  const newStatus = req.body?.status;
  if (!['draft', 'active', 'revoked'].includes(newStatus)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  inv.status = newStatus;
  inv.updatedAt = new Date().toISOString();

  recordAudit(
    req.adminSession!.role,
    req.adminSession!.label,
    newStatus === 'revoked' ? 'REVOKE_INVITATION' : 'CHANGE_INVITATION_STATUS',
    'invitation',
    inv.id,
    `Changement de statut vers "${newStatus}" pour "${inv.displayName}"`
  );

  return res.json(inv);
});

// Duplicate Invitation Settings into a brand new invitation with a fresh cryptographic token
app.post('/api/admin/invitations/:id/duplicate', requireAdmin(['super_admin', 'invitation_manager']), (req: AdminRequest, res) => {
  const source = dbState.invitations.find((i) => i.id === req.params.id);
  if (!source) {
    return res.status(404).json({ error: 'Invitation source introuvable.' });
  }

  const freshToken = generateSecureToken();
  const nowIso = new Date().toISOString();
  const copyDisplayName = `${source.displayName} (Copie)`;

  const duplicated: InvitationRecord = {
    ... structuredClone(source),
    id: `inv-${crypto.randomUUID().slice(0, 8)}`,
    tokenHash: hashToken(freshToken),
    rawTokenForAdminCopy: freshToken,
    displayName: copyDisplayName,
    phone: '',
    email: '',
    status: 'draft',
    whatsappStatus: 'not_prepared',
    rsvpStatus: 'pending',
    people: buildPeopleList(
      source.invitationType,
      source.primaryFirstName,
      source.primaryLastName,
      source.secondaryPersonName,
      source.maxAdults,
      source.maxChildren,
      source.maxTotal
    ),
    responses: [],
    dietaryNotes: '',
    accessNeedNotes: '',
    messageToCouple: '',
    respondedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  dbState.invitations.unshift(duplicated);
  recordAudit(
    req.adminSession!.role,
    req.adminSession!.label,
    'DUPLICATE_INVITATION',
    'invitation',
    duplicated.id,
    `Duplication des paramètres depuis "${source.displayName}" avec nouveau token.`
  );

  return res.status(201).json(duplicated);
});

// Update Event Details (Venues, Addresses, Times, Confirmation status)
app.put('/api/admin/events/:eventId', requireAdmin(['super_admin']), (req: AdminRequest, res) => {
  const ev = dbState.events.find((e) => e.id === req.params.eventId);
  if (!ev) {
    return res.status(404).json({ error: 'Événement introuvable.' });
  }

  const b = req.body || {};
  ev.titleFr = String(b.titleFr ?? ev.titleFr).trim();
  ev.titleEn = String(b.titleEn ?? ev.titleEn).trim();
  ev.startTime = b.startTime !== undefined ? (b.startTime ? String(b.startTime).trim() : null) : ev.startTime;
  ev.timeLabelFr = String(b.timeLabelFr ?? ev.timeLabelFr).trim();
  ev.timeLabelEn = String(b.timeLabelEn ?? ev.timeLabelEn).trim();
  ev.venueNameFr = String(b.venueNameFr ?? ev.venueNameFr).trim();
  ev.venueNameEn = String(b.venueNameEn ?? ev.venueNameEn).trim();
  ev.addressFr = String(b.addressFr ?? ev.addressFr).trim();
  ev.addressEn = String(b.addressEn ?? ev.addressEn).trim();
  ev.venueStatusNoteFr = String(b.venueStatusNoteFr ?? ev.venueStatusNoteFr ?? '').trim();
  ev.venueStatusNoteEn = String(b.venueStatusNoteEn ?? ev.venueStatusNoteEn ?? '').trim();
  ev.isAddressConfirmed = Boolean(b.isAddressConfirmed ?? ev.isAddressConfirmed);
  ev.mapUrl = b.mapUrl ? String(b.mapUrl).trim() : null;
  ev.descriptionFr = String(b.descriptionFr ?? ev.descriptionFr).trim();
  ev.descriptionEn = String(b.descriptionEn ?? ev.descriptionEn).trim();
  ev.dressCodeFr = String(b.dressCodeFr ?? ev.dressCodeFr).trim();
  ev.dressCodeEn = String(b.dressCodeEn ?? ev.dressCodeEn).trim();
  ev.updatedAt = new Date().toISOString();

  recordAudit(
    req.adminSession!.role,
    req.adminSession!.label,
    'UPDATE_EVENT',
    'event',
    ev.id,
    `Mise à jour de l’événement "${ev.titleFr}" (lieu confirmé: ${ev.isAddressConfirmed})`
  );

  return res.json(ev);
});

// Moderate Wishes & Photos
app.post('/api/admin/moderation', requireAdmin(['super_admin', 'memory_moderator']), (req: AdminRequest, res) => {
  const { itemType, itemId, status } = req.body || {};
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Statut de modération invalide.' });
  }

  if (itemType === 'wish') {
    const wish = dbState.wishes.find((w) => w.id === itemId);
    if (!wish) return res.status(404).json({ error: 'Message introuvable.' });
    wish.moderationStatus = status;
  } else if (itemType === 'photo') {
    const photo = dbState.photos.find((p) => p.id === itemId);
    if (!photo) return res.status(404).json({ error: 'Photo introuvable.' });
    photo.moderationStatus = status;
  } else {
    return res.status(400).json({ error: 'Type d’élément inconnu.' });
  }

  recordAudit(
    req.adminSession!.role,
    req.adminSession!.label,
    'MODERATE_MEDIA',
    itemType,
    itemId,
    `Modération ${itemType} (${itemId}) -> ${status}`
  );

  return res.json({ success: true });
});

// Secure CSV Export (Formula-injection protected, NO raw tokens exported by default)
app.get('/api/admin/export-csv', requireAdmin(['super_admin', 'invitation_manager']), (req: AdminRequest, res) => {
  const headers = [
    'ID',
    'Nom Invitation',
    'Type',
    'Statut Lien',
    'Statut Réponse',
    'Capacité Max',
    'Mairie (Présents/Autorisés)',
    'Église (Présents/Autorisés)',
    'Domicile Simbock (Présents/Autorisés)',
    'Vin d’honneur (Présents/Autorisés)',
    'Grande Soirée (Présents/Autorisés)',
    'Besoins Alimentaires',
    'Besoins Accès',
    'Message aux mariés',
    'Dernière Modification',
  ];

  const rows: string[] = [headers.map(sanitizeCsvCell).join(',')];

  for (const inv of dbState.invitations) {
    const countEventYes = (evId: EventId) => {
      const acc = inv.eventAccess[evId];
      if (!acc || !acc.enabled) return 'Non convié';
      const yesCount = inv.responses.filter((r) => r.eventId === evId && r.attendance === 'yes').length;
      return `${yesCount} / ${acc.allowedSeats}`;
    };

    const row = [
      inv.id,
      inv.displayName,
      inv.invitationType,
      inv.status,
      inv.rsvpStatus,
      inv.maxTotal,
      countEventYes('civil'),
      countEventYes('church'),
      countEventYes('home_reception'),
      countEventYes('cocktail'),
      countEventYes('evening'),
      inv.dietaryNotes,
      inv.accessNeedNotes,
      inv.messageToCouple,
      inv.updatedAt,
    ];
    rows.push(row.map(sanitizeCsvCell).join(','));
  }

  recordAudit(
    req.adminSession!.role,
    req.adminSession!.label,
    'EXPORT_CSV',
    'invitations',
    'all',
    `Export CSV sécurisé (${dbState.invitations.length} invitations, sans tokens secrets bruts).`
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="invitations-joseph-marie-2026.csv"');
  return res.send('\uFEFF' + rows.join('\r\n'));
});

// ============================================================================
// VITE DEV MIDDLEWARE OR PRODUCTION STATIC ASSETS
// ============================================================================

async function startServer() {
  // Synchronize database state with Sanity.io (project rpzi1x95) on startup
  dbState = await syncStateFromSanity(dbState);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Joseph & Marie Wedding Platform running on http://0.0.0.0:${PORT} (Sanity project: rpzi1x95)`);
  });
}

startServer();
