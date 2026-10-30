import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Calendar,
  CheckSquare,
  Image as ImageIcon,
  LogOut,
  Copy,
  Share2,
  Eye,
  RotateCw,
  Ban,
  CheckCircle2,
  Download,
  Search,
  Lock,
  ExternalLink,
  CopyPlus,
  AlertTriangle,
  Edit3,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.tsx';
import {
  AdminRole,
  AuditLogEntry,
  CapacityMode,
  EventId,
  GuestWishMessage,
  InvitationRecord,
  InvitationStatus,
  InvitationType,
  SharedMemoryPhoto,
  WeddingEventConfig,
} from '../types/wedding.ts';

export type AdminSection =
  | 'dashboard'
  | 'invitations'
  | 'new_invitation'
  | 'edit_invitation'
  | 'events'
  | 'responses'
  | 'memories';

const ALL_EVENTS: { id: EventId; labelFr: string; labelEn: string }[] = [
  { id: 'civil', labelFr: 'Mariage civil (11h30)', labelEn: 'Civil Ceremony (11:30 AM)' },
  { id: 'church', labelFr: 'Cérémonie religieuse (14h30)', labelEn: 'Religious Ceremony (2:30 PM)' },
  { id: 'home_reception', labelFr: 'Accueil au domicile (Simbock)', labelEn: 'Home Welcome (Simbock)' },
  { id: 'cocktail', labelFr: 'Vin d’honneur et photos', labelEn: 'Cocktail & Photos' },
  { id: 'evening', labelFr: 'Grande soirée (20h00)', labelEn: 'Grand Soirée (8:00 PM)' },
];

export const AdminPortalPage: React.FC<{ section: AdminSection }> = ({ section }) => {
  const { id: editInvitationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang, setLang, formatDate } = useI18n();

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('jm_admin_token');
    } catch {
      return null;
    }
  });
  const [adminRole, setAdminRole] = useState<AdminRole>('super_admin');
  const [adminLabel, setAdminLabel] = useState<string>('Organisateur');

  // Login state
  const [accessCodeInput, setAccessCodeInput] = useState('JM2026-ADMIN');
  const [actorLabelInput, setActorLabelInput] = useState('Joseph & Marie');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Data state
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<WeddingEventConfig[]>([]);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [wishes, setWishes] = useState<GuestWishMessage[]>([]);
  const [photos, setPhotos] = useState<SharedMemoryPhoto[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [toastMessage, setToastMessage] = useState('');

  // Search & filters for invitations table
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRsvp, setFilterRsvp] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // WhatsApp Sharing Modal state
  const [whatsAppModalInv, setWhatsAppModalInv] = useState<InvitationRecord | null>(null);

  // Confirmation modal for sensitive actions (Revoke / Rotate Token)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'revoke' | 'rotate' | 'activate';
    invitation: InvitationRecord;
  } | null>(null);

  // Form state for New / Edit Invitation (Blocs A to F)
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formSecondaryName, setFormSecondaryName] = useState('');
  const [formGreetingFr, setFormGreetingFr] = useState('');
  const [formGreetingEn, setFormGreetingEn] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formInternalNote, setFormInternalNote] = useState('');
  const [formType, setFormType] = useState<InvitationType>('individual');
  const [formMaxAdults, setFormMaxAdults] = useState(1);
  const [formMaxChildren, setFormMaxChildren] = useState(0);
  const [formCapacityMode, setFormCapacityMode] = useState<CapacityMode>('simple');
  const [formEventAccess, setFormEventAccess] = useState<
    Record<EventId, { enabled: boolean; allowedSeats: number }>
  >({
    civil: { enabled: false, allowedSeats: 1 },
    church: { enabled: true, allowedSeats: 1 },
    home_reception: { enabled: false, allowedSeats: 1 },
    cocktail: { enabled: false, allowedSeats: 1 },
    evening: { enabled: true, allowedSeats: 1 },
  });
  const [formPersonalNoteFr, setFormPersonalNoteFr] = useState('');
  const [formPersonalNoteEn, setFormPersonalNoteEn] = useState('');
  const [formPreferredLang, setFormPreferredLang] = useState<'fr' | 'en'>('fr');
  const [formRsvpDeadline, setFormRsvpDeadline] = useState('2026-11-25T23:59:00.000Z');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formAccessCodeRequired, setFormAccessCodeRequired] = useState(false);
  const [formAccessPin, setFormAccessPin] = useState('');
  const [formAllowMaybe, setFormAllowMaybe] = useState(true);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchOverview = async (tokenToUse: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      if (res.status === 401) {
        setSessionToken(null);
        sessionStorage.removeItem('jm_admin_token');
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAdminRole(data.role);
        setAdminLabel(data.label);
        setEvents(data.events || []);
        setInvitations(data.invitations || []);
        setWishes(data.wishes || []);
        setPhotos(data.photos || []);
        setAuditLogs(data.auditLogs || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Administration — Mariage Joseph & Marie';
    if (sessionToken) {
      fetchOverview(sessionToken);
    }
  }, [sessionToken]);

  // Populate form when editing an existing invitation or resetting for new
  useEffect(() => {
    if (section === 'new_invitation') {
      setFormDisplayName('');
      setFormFirstName('');
      setFormLastName('');
      setFormSecondaryName('');
      setFormGreetingFr('');
      setFormGreetingEn('');
      setFormPhone('');
      setFormEmail('');
      setFormInternalNote('');
      setFormType('individual');
      setFormMaxAdults(1);
      setFormMaxChildren(0);
      setFormCapacityMode('simple');
      setFormEventAccess({
        civil: { enabled: false, allowedSeats: 1 },
        church: { enabled: true, allowedSeats: 1 },
        home_reception: { enabled: false, allowedSeats: 1 },
        cocktail: { enabled: false, allowedSeats: 1 },
        evening: { enabled: true, allowedSeats: 1 },
      });
      setFormPersonalNoteFr('');
      setFormPersonalNoteEn('');
      setFormPreferredLang('fr');
      setFormRsvpDeadline('2026-11-25T23:59:00.000Z');
      setFormExpiresAt('');
      setFormAccessCodeRequired(false);
      setFormAccessPin('');
      setFormAllowMaybe(true);
      setFormError('');
    } else if (section === 'edit_invitation' && editInvitationId) {
      const found = invitations.find((i) => i.id === editInvitationId);
      if (found) {
        setFormDisplayName(found.displayName);
        setFormFirstName(found.primaryFirstName);
        setFormLastName(found.primaryLastName);
        setFormSecondaryName(found.secondaryPersonName || '');
        setFormGreetingFr(found.customGreetingFr || '');
        setFormGreetingEn(found.customGreetingEn || '');
        setFormPhone(found.phone || '');
        setFormEmail(found.email || '');
        setFormInternalNote(found.internalNote || '');
        setFormType(found.invitationType);
        setFormMaxAdults(found.maxAdults);
        setFormMaxChildren(found.maxChildren);
        setFormCapacityMode(found.capacityMode);
        setFormEventAccess(structuredClone(found.eventAccess));
        setFormPersonalNoteFr(found.personalNoteFr || '');
        setFormPersonalNoteEn(found.personalNoteEn || '');
        setFormPreferredLang(found.preferredLang);
        setFormRsvpDeadline(found.rsvpDeadline || '');
        setFormExpiresAt(found.expiresAt || '');
        setFormAccessCodeRequired(found.accessCodeRequired);
        setFormAccessPin(found.accessPin || '');
        setFormAllowMaybe(found.allowMaybeOption);
        setFormError('');
      }
    }
  }, [section, editInvitationId, invitations]);

  // Synchronize capacities when invitation type changes
  const handleTypeChange = (newType: InvitationType) => {
    setFormType(newType);
    let newTotal = 1;
    if (newType === 'individual') {
      setFormMaxAdults(1);
      setFormMaxChildren(0);
      newTotal = 1;
    } else if (newType === 'couple' || newType === 'plus_one') {
      setFormMaxAdults(2);
      setFormMaxChildren(0);
      newTotal = 2;
    } else {
      setFormMaxAdults(2);
      setFormMaxChildren(2);
      newTotal = 4;
    }
    setFormEventAccess((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next) as EventId[]) {
        next[k] = { ...next[k], allowedSeats: newTotal };
      }
      return next;
    });
  };

  const computedMaxTotal =
    formType === 'individual'
      ? 1
      : formType === 'couple' || formType === 'plus_one'
      ? 2
      : Math.max(1, formMaxAdults) + Math.max(0, formMaxChildren);

  const executeLoginWithCode = async (codeToUse: string) => {
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode: codeToUse.trim(),
          actorLabel: actorLabelInput.trim() || 'Joseph & Marie',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Échec de connexion');
      } else {
        setSessionToken(data.token);
        sessionStorage.setItem('jm_admin_token', data.token);
      }
    } catch {
      setLoginError('Erreur réseau lors de la connexion.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLoginWithCode(accessCodeInput);
  };

  const handleLogout = async () => {
    if (sessionToken) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      }).catch(() => {});
    }
    setSessionToken(null);
    sessionStorage.removeItem('jm_admin_token');
  };

  // Save Invitation (Draft or Active)
  const handleSaveInvitation = async (targetStatus: InvitationStatus) => {
    if (!sessionToken) return;
    setFormSaving(true);
    setFormError('');

    const isEditing = section === 'edit_invitation' && editInvitationId;
    const url = isEditing
      ? `/api/admin/invitations/${encodeURIComponent(editInvitationId)}`
      : '/api/admin/invitations';
    const method = isEditing ? 'PUT' : 'POST';

    const normalizedAccess = { ...formEventAccess };
    for (const k of Object.keys(normalizedAccess) as EventId[]) {
      if (formCapacityMode === 'simple') {
        normalizedAccess[k].allowedSeats = normalizedAccess[k].enabled ? computedMaxTotal : 0;
      } else {
        normalizedAccess[k].allowedSeats = normalizedAccess[k].enabled
          ? Math.min(Math.max(1, normalizedAccess[k].allowedSeats), computedMaxTotal)
          : 0;
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          displayName: formDisplayName,
          primaryFirstName: formFirstName,
          primaryLastName: formLastName,
          secondaryPersonName: formSecondaryName,
          customGreetingFr: formGreetingFr,
          customGreetingEn: formGreetingEn,
          personalNoteFr: formPersonalNoteFr,
          personalNoteEn: formPersonalNoteEn,
          phone: formPhone,
          email: formEmail,
          internalNote: formInternalNote,
          invitationType: formType,
          maxAdults: formMaxAdults,
          maxChildren: formMaxChildren,
          maxTotal: computedMaxTotal,
          capacityMode: formCapacityMode,
          eventAccess: normalizedAccess,
          preferredLang: formPreferredLang,
          rsvpDeadline: formRsvpDeadline || null,
          expiresAt: formExpiresAt || null,
          accessCodeRequired: formAccessCodeRequired,
          accessPin: formAccessPin || null,
          allowMaybeOption: formAllowMaybe,
          status: targetStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Erreur lors de la sauvegarde.');
      } else {
        await fetchOverview(sessionToken);
        showToast(
          isEditing
            ? 'Invitation mise à jour (le lien personnel reste inchangé).'
            : 'Nouvelle invitation créée et lien privé généré.'
        );
        navigate(`/admin/invitations/${data.id}`);
      }
    } catch {
      setFormError('Erreur réseau lors de la sauvegarde.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDuplicateInvitation = async (inv: InvitationRecord) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/admin/invitations/${encodeURIComponent(inv.id)}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (res.ok) {
      const duplicated = await res.json();
      await fetchOverview(sessionToken);
      showToast('Paramètres dupliqués avec un nouveau token indépendant.');
      navigate(`/admin/invitations/${duplicated.id}`);
    }
  };

  const handleExecuteConfirmedAction = async () => {
    if (!confirmAction || !sessionToken) return;
    const { type, invitation: inv } = confirmAction;

    if (type === 'rotate') {
      const res = await fetch(`/api/admin/invitations/${encodeURIComponent(inv.id)}/rotate-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        await fetchOverview(sessionToken);
        showToast('Nouveau lien généré. L’ancien lien est immédiatement invalidé.');
      }
    } else {
      const newStatus = type === 'revoke' ? 'revoked' : 'active';
      const res = await fetch(`/api/admin/invitations/${encodeURIComponent(inv.id)}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchOverview(sessionToken);
        showToast(
          newStatus === 'revoked'
            ? `L’invitation de "${inv.displayName}" a été révoquée.`
            : `L’invitation de "${inv.displayName}" a été réactivée.`
        );
      }
    }
    setConfirmAction(null);
  };

  const handleCopyLink = (inv: InvitationRecord) => {
    const url = `${window.location.origin}/invitation/${inv.rawTokenForAdminCopy}`;
    navigator.clipboard.writeText(url);
    showToast(`Lien personnel de "${inv.displayName}" copié dans le presse-papiers.`);
  };

  const handleExportCsv = async () => {
    if (!sessionToken) return;
    const res = await fetch('/api/admin/export-csv', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invitations-joseph-marie-2026.csv';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export CSV téléchargé.');
    }
  };

  const handleUpdateEvent = async (ev: WeddingEventConfig) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/admin/events/${encodeURIComponent(ev.id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(ev),
    });
    if (res.ok) {
      await fetchOverview(sessionToken);
      showToast(`Événement « ${ev.titleFr} » mis à jour.`);
    }
  };

  const handleModerate = async (itemType: 'wish' | 'photo', itemId: string, status: 'approved' | 'rejected') => {
    if (!sessionToken) return;
    const res = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ itemType, itemId, status }),
    });
    if (res.ok) {
      await fetchOverview(sessionToken);
      showToast('Statut de modération mis à jour.');
    }
  };

  const handleMarkWhatsAppStatus = async (inv: InvitationRecord, status: 'prepared' | 'declared_sent') => {
    if (!sessionToken) return;
    await fetch(`/api/admin/invitations/${encodeURIComponent(inv.id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ whatsappStatus: status }),
    });
    await fetchOverview(sessionToken);
  };

  // ==========================================================================
  // RENDER LOGIN GATE IF NOT AUTHENTICATED
  // ==========================================================================
  if (!sessionToken) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#FFF8FB] px-4 py-12">
        <div className="max-w-md w-full bg-white border border-[#EEDDE5] rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_rgb(118,39,71,0.06)]">
          <div className="flex items-center justify-between">
            <Link to="/" className="font-serif-title text-2xl font-semibold text-[#762747]">
              J &amp; M
            </Link>
            <span className="text-xs font-medium text-[#A93665]">
              Administration Sécurisée
            </span>
          </div>

          <h1 className="font-serif-title text-3xl font-semibold text-[#30232B] mt-6">
            Espace Organisateurs
          </h1>
          <p className="text-xs sm:text-sm text-[#796670] mt-1">
            Authentification par rôle pour gérer les invitations privées, les événements et les confirmations.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-actor" className="block text-xs font-medium text-[#30232B] mb-1.5">
                Votre nom (pour le journal d’audit)
              </label>
              <input
                id="admin-actor"
                type="text"
                value={actorLabelInput}
                onChange={(e) => setActorLabelInput(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
              />
            </div>

            <div>
              <label htmlFor="admin-code" className="block text-xs font-medium text-[#30232B] mb-1.5">
                Clé d’accès par rôle
              </label>
              <input
                id="admin-code"
                type="text"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm font-mono font-semibold text-[#762747]"
              />
            </div>

            {/* Quick Role Selector Buttons (1-Click Instant Login) */}
            <div className="pt-1">
              <p className="text-[11px] text-[#796670] mb-2">
                Cliquez sur un rôle pour vous connecter directement :
              </p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'Admin Principal (Super Admin)', code: 'JM2026-ADMIN' },
                  { label: 'Gestionnaire Invitations', code: 'JM2026-INVITES' },
                  { label: 'Modérateur Souvenirs', code: 'JM2026-SOUVENIRS' },
                ].map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => {
                      setAccessCodeInput(r.code);
                      executeLoginWithCode(r.code);
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs border transition-colors cursor-pointer ${
                      accessCodeInput === r.code
                        ? 'bg-[#F6D6E2]/60 border-[#A93665] text-[#762747] font-semibold'
                        : 'bg-[#FFF8FB] hover:bg-[#F6D6E2]/30 border-[#EEDDE5] text-[#30232B]'
                    }`}
                  >
                    <span>{r.label}</span>
                    <span className="font-mono text-[11px] text-[#A93665]">{r.code}</span>
                  </button>
                ))}
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-red-700 font-medium">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 px-6 rounded-full bg-[#A93665] hover:bg-[#762747] text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {loggingIn ? 'Connexion en cours...' : 'Se connecter à l’administration'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#EEDDE5] text-center">
            <Link to="/" className="text-xs text-[#796670] hover:text-[#30232B]">
              ← Retour à la page publique du mariage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // COMPUTE DASHBOARD METRICS (Strict distinction between Invitations & People)
  // ==========================================================================
  const activeInvitations = invitations.filter((i) => i.status === 'active');
  const totalInvitationsCount = activeInvitations.length;
  const totalInvitedPeopleCount = activeInvitations.reduce((acc, i) => acc + i.maxTotal, 0);
  const respondedInvitationsCount = activeInvitations.filter((i) => Boolean(i.respondedAt)).length;
  const pendingInvitationsCount = activeInvitations.filter((i) => i.rsvpStatus === 'pending').length;

  // Declined people count
  const declinedPeopleCount = activeInvitations.reduce((acc, inv) => {
    const activeEventIds = ALL_EVENTS.map((e) => e.id).filter((id) => inv.eventAccess[id]?.enabled);
    let declinedInInv = 0;
    for (const p of inv.people) {
      const personResps = inv.responses.filter(
        (r) => r.personId === p.id && activeEventIds.includes(r.eventId)
      );
      if (personResps.length > 0 && personResps.every((r) => r.attendance === 'no')) {
        declinedInInv++;
      }
    }
    return acc + declinedInInv;
  }, 0);

  // Expected attendees per event
  const attendeesByEvent: Record<EventId, { confirmedYes: number; totalInvitedSeats: number }> = {
    civil: { confirmedYes: 0, totalInvitedSeats: 0 },
    church: { confirmedYes: 0, totalInvitedSeats: 0 },
    home_reception: { confirmedYes: 0, totalInvitedSeats: 0 },
    cocktail: { confirmedYes: 0, totalInvitedSeats: 0 },
    evening: { confirmedYes: 0, totalInvitedSeats: 0 },
  };

  for (const inv of activeInvitations) {
    for (const ev of ALL_EVENTS) {
      const acc = inv.eventAccess[ev.id];
      if (acc?.enabled) {
        attendeesByEvent[ev.id].totalInvitedSeats += acc.allowedSeats;
        const yesForEv = inv.responses.filter(
          (r) => r.eventId === ev.id && r.attendance === 'yes'
        ).length;
        attendeesByEvent[ev.id].confirmedYes += yesForEv;
      }
    }
  }

  // Filtered invitations list
  const filteredInvitations = invitations.filter((inv) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = inv.displayName.toLowerCase().includes(q);
      const matchPrimary = `${inv.primaryFirstName} ${inv.primaryLastName}`.toLowerCase().includes(q);
      const matchPhone = (inv.phone || '').toLowerCase().includes(q);
      const matchEmail = (inv.email || '').toLowerCase().includes(q);
      const matchNote = (inv.internalNote || '').toLowerCase().includes(q);
      if (!matchName && !matchPrimary && !matchPhone && !matchEmail && !matchNote) {
        return false;
      }
    }
    if (filterEvent !== 'all') {
      if (!inv.eventAccess[filterEvent as EventId]?.enabled) return false;
    }
    if (filterType !== 'all' && inv.invitationType !== filterType) return false;
    if (filterRsvp !== 'all' && inv.rsvpStatus !== filterRsvp) return false;
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    return true;
  });

  const currentEditingInv =
    section === 'edit_invitation' && editInvitationId
      ? invitations.find((i) => i.id === editInvitationId)
      : null;

  return (
    <div className="min-h-screen flex bg-[#FFF8FB] text-[#30232B]">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white border-r border-[#EEDDE5] hidden lg:flex flex-col justify-between p-6 shrink-0">
        <div className="space-y-8">
          <div>
            <Link to="/" className="font-serif-title text-3xl font-semibold text-[#762747]">
              Joseph &amp; Marie
            </Link>
            <p className="text-xs text-[#796670] mt-1">
              Administration · 1er Déc. 2026
            </p>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Tableau de bord', to: '/admin', icon: LayoutDashboard },
              { id: 'invitations', label: 'Invitations & Liens', to: '/admin/invitations', icon: Users },
              { id: 'new_invitation', label: 'Nouvelle invitation', to: '/admin/invitations/nouvelle', icon: PlusCircle },
              { id: 'events', label: 'Les 5 Événements', to: '/admin/evenements', icon: Calendar },
              { id: 'responses', label: 'Réponses & Besoins', to: '/admin/reponses', icon: CheckSquare },
              { id: 'memories', label: 'Souvenirs & Vœux', to: '/admin/souvenirs', icon: ImageIcon },
            ].map((item) => {
              const Icon = item.icon;
              const isActive =
                section === item.id ||
                (section === 'edit_invitation' && item.id === 'invitations');
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#A93665] text-white'
                      : 'text-[#796670] hover:bg-[#FFF8FB] hover:text-[#30232B]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-[#EEDDE5] space-y-3">
          <div className="text-xs">
            <p className="font-medium text-[#30232B]">{adminLabel}</p>
            <p className="text-[#796670]">Rôle : {adminRole}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-[#EEDDE5] text-xs font-medium text-[#762747] hover:bg-[#FFF8FB] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract */}
        <header className="bg-white border-b border-[#EEDDE5] px-4 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link to="/admin" className="font-serif-title text-lg sm:text-xl font-semibold text-[#762747] lg:hidden shrink-0">
              J &amp; M Admin
            </Link>
            <span className="text-xs sm:text-sm font-medium text-[#796670] truncate">
              <span className="hidden sm:inline">Administration / </span>
              <strong className="text-[#30232B]">
                {section === 'dashboard' && 'Vue d’ensemble'}
                {section === 'invitations' && 'Gestion des invitations'}
                {section === 'new_invitation' && 'Créer une invitation'}
                {section === 'edit_invitation' && 'Édition d’invitation'}
                {section === 'events' && 'Les 5 événements'}
                {section === 'responses' && 'Confirmations & régimes'}
                {section === 'memories' && 'Galerie & Vœux'}
              </strong>
            </span>
          </div>

          {/* Mobile quick nav + Primary CTA */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-[#FFF8FB] hover:bg-[#F6D6E2]/40 border border-[#EEDDE5] text-xs font-medium text-[#762747] cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#A93665]" />
              <span>CSV</span>
            </button>

            <Link
              to="/admin/invitations/nouvelle"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#A93665] hover:bg-[#762747] text-white text-xs font-medium transition-colors whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nouvelle invitation</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#EEDDE5] text-xs font-medium text-[#762747] hover:bg-[#FFF8FB] cursor-pointer"
              aria-label="Déconnexion"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Mobile & Tablet Sub-navigation */}
        <div className="lg:hidden flex overflow-x-auto gap-1.5 px-4 py-2.5 bg-white border-b border-[#EEDDE5]">
          {[
            { id: 'dashboard', label: 'Tableau de bord', to: '/admin' },
            { id: 'invitations', label: 'Invitations', to: '/admin/invitations' },
            { id: 'new_invitation', label: '+ Nouvelle', to: '/admin/invitations/nouvelle' },
            { id: 'events', label: 'Événements', to: '/admin/evenements' },
            { id: 'responses', label: 'Réponses', to: '/admin/reponses' },
            { id: 'memories', label: 'Souvenirs', to: '/admin/souvenirs' },
          ].map((m) => {
            const isActive =
              section === m.id || (section === 'edit_invitation' && m.id === 'invitations');
            return (
              <Link
                key={m.to}
                to={m.to}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#A93665] text-white'
                    : 'bg-[#FFF8FB] border border-[#EEDDE5] text-[#30232B]'
                }`}
              >
                {m.label}
              </Link>
            );
          })}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-medium flex items-center justify-between"
          >
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage('')}
              className="text-xs underline ml-4 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-8">
          {/* ================================================================
              SECTION 1: DASHBOARD OVERVIEW & KPI STRIP
             ================================================================ */}
          {section === 'dashboard' && (
            <>
              {/* 5 Distinct Metrics (Never confusing invitations with people) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-[#EEDDE5] rounded-2xl p-5">
                  <p className="text-xs text-[#796670]">Invitations actives (liens)</p>
                  <p className="font-serif-title text-4xl font-semibold text-[#30232B] mt-1 tabular-nums">
                    {totalInvitationsCount}
                  </p>
                </div>
                <div className="bg-white border border-[#EEDDE5] rounded-2xl p-5">
                  <p className="text-xs text-[#796670]">Personnes conviées (places)</p>
                  <p className="font-serif-title text-4xl font-semibold text-[#762747] mt-1 tabular-nums">
                    {totalInvitedPeopleCount}
                  </p>
                </div>
                <div className="bg-white border border-[#EEDDE5] rounded-2xl p-5">
                  <p className="text-xs text-[#796670]">Réponses reçues</p>
                  <p className="font-serif-title text-4xl font-semibold text-emerald-700 mt-1 tabular-nums">
                    {respondedInvitationsCount}
                  </p>
                </div>
                <div className="bg-white border border-[#EEDDE5] rounded-2xl p-5">
                  <p className="text-xs text-[#796670]">Invitations en attente</p>
                  <p className="font-serif-title text-4xl font-semibold text-amber-700 mt-1 tabular-nums">
                    {pendingInvitationsCount}
                  </p>
                </div>
                <div className="bg-white border border-[#EEDDE5] rounded-2xl p-5">
                  <p className="text-xs text-[#796670]">Personnes ayant décliné</p>
                  <p className="font-serif-title text-4xl font-semibold text-[#796670] mt-1 tabular-nums">
                    {declinedPeopleCount}
                  </p>
                </div>
              </div>

              {/* Attendance Breakdown Per Event */}
              <div className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-serif-title text-2xl font-semibold text-[#30232B]">
                      Personnes présentes prévues par événement
                    </h2>
                    <p className="text-xs text-[#796670] mt-0.5">
                      Décompte exact des personnes confirmées (« Oui ») par rapport aux places autorisées.
                    </p>
                  </div>
                  <Link
                    to="/admin/evenements"
                    className="text-xs font-medium text-[#A93665] hover:underline"
                  >
                    Modifier les lieux &amp; horaires →
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {ALL_EVENTS.map((ev) => {
                    const stats = attendeesByEvent[ev.id];
                    return (
                      <div
                        key={ev.id}
                        className="p-4 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] flex flex-col justify-between"
                      >
                        <p className="text-xs font-medium text-[#30232B]">{ev.labelFr}</p>
                        <div className="mt-4">
                          <p className="font-serif-title text-3xl font-semibold text-[#762747] tabular-nums">
                            {stats.confirmedYes}{' '}
                            <span className="text-base font-normal text-[#796670]">
                              / {stats.totalInvitedSeats} pers.
                            </span>
                          </p>
                          <p className="text-[11px] text-[#796670] mt-1">
                            Présents confirmés / Places conviées
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ================================================================
              SECTION 2: INVITATIONS TABLE (Shown on Dashboard & Invitations view)
             ================================================================ */}
          {(section === 'dashboard' || section === 'invitations') && (
            <div className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif-title text-2xl font-semibold text-[#30232B]">
                    Répertoire des invitations personnalisées
                  </h2>
                  <p className="text-xs text-[#796670]">
                    Chaque invitation possède un lien privé unique et ses propres autorisations d’événements.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#796670] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nom, tél, e-mail, note..."
                      className="pl-9 pr-4 py-2 rounded-full bg-[#FFF8FB] border border-[#EEDDE5] text-xs text-[#30232B] focus:outline-none focus:border-[#A93665]"
                    />
                  </div>

                  <select
                    aria-label="Filtrer par événement"
                    value={filterEvent}
                    onChange={(e) => setFilterEvent(e.target.value)}
                    className="px-3 py-2 rounded-full bg-[#FFF8FB] border border-[#EEDDE5] text-xs text-[#30232B]"
                  >
                    <option value="all">Tous les événements</option>
                    {ALL_EVENTS.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.labelFr}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filtrer par type"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 rounded-full bg-[#FFF8FB] border border-[#EEDDE5] text-xs text-[#30232B]"
                  >
                    <option value="all">Tous les types</option>
                    <option value="individual">Individuelle</option>
                    <option value="couple">Couple nommé</option>
                    <option value="plus_one">Accompagnant libre</option>
                    <option value="family">Familiale</option>
                  </select>

                  <select
                    aria-label="Filtrer par réponse"
                    value={filterRsvp}
                    onChange={(e) => setFilterRsvp(e.target.value)}
                    className="px-3 py-2 rounded-full bg-[#FFF8FB] border border-[#EEDDE5] text-xs text-[#30232B]"
                  >
                    <option value="all">Toutes réponses</option>
                    <option value="pending">En attente</option>
                    <option value="accepted">Accepté</option>
                    <option value="partial">Partiel</option>
                    <option value="declined">Décliné</option>
                  </select>

                  <select
                    aria-label="Filtrer par statut"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 rounded-full bg-[#FFF8FB] border border-[#EEDDE5] text-xs text-[#30232B]"
                  >
                    <option value="all">Tous statuts</option>
                    <option value="active">Actives</option>
                    <option value="draft">Brouillons</option>
                    <option value="revoked">Révoquées</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EEDDE5] text-[11px] font-semibold text-[#796670]">
                      <th className="py-3 pr-4">Invité / Affichage</th>
                      <th className="py-3 px-3">Type &amp; Capacité</th>
                      <th className="py-3 px-3">Événements autorisés</th>
                      <th className="py-3 px-3">Statut lien</th>
                      <th className="py-3 px-3">Réponse</th>
                      <th className="py-3 pl-3 text-right">Actions rapides</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEDDE5]/70 text-xs">
                    {filteredInvitations.map((inv) => {
                      const enabledEvs = ALL_EVENTS.filter((e) => inv.eventAccess[e.id]?.enabled);
                      return (
                        <tr key={inv.id} className="hover:bg-[#FFF8FB]/80 transition-colors">
                          <td className="py-3.5 pr-4">
                            <p className="font-semibold text-[#30232B]">{inv.displayName}</p>
                            {inv.internalNote && (
                              <p className="text-[11px] text-[#796670] line-clamp-1 mt-0.5">
                                Note : {inv.internalNote}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums">
                            <span className="font-medium text-[#30232B]">
                              {inv.maxTotal} pers.
                            </span>
                            <span className="text-[#796670]">
                              {' '}
                              ·{' '}
                              {inv.invitationType === 'individual'
                                ? 'Individuel'
                                : inv.invitationType === 'couple'
                                ? 'Couple'
                                : inv.invitationType === 'plus_one'
                                ? '+1 libre'
                                : 'Famille'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="text-[#30232B] leading-snug">
                              {enabledEvs
                                .map(
                                  (e) =>
                                    `${e.labelFr.split(' (')[0]} (${inv.eventAccess[e.id].allowedSeats})`
                                )
                                .join(' · ')}
                            </p>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`font-medium ${
                                inv.status === 'active'
                                  ? 'text-emerald-700'
                                  : inv.status === 'revoked'
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {inv.status === 'active'
                                ? 'Actif'
                                : inv.status === 'revoked'
                                ? 'Révoqué'
                                : 'Brouillon'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="font-medium text-[#30232B]">
                              {inv.rsvpStatus === 'accepted'
                                ? 'Confirmé'
                                : inv.rsvpStatus === 'partial'
                                ? 'Partiel'
                                : inv.rsvpStatus === 'declined'
                                ? 'Décliné'
                                : 'En attente'}
                            </span>
                          </td>
                          <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <Link
                                to={`/invitation/${inv.rawTokenForAdminCopy}`}
                                className="p-2 rounded-lg hover:bg-[#F6D6E2]/40 text-[#762747]"
                                title="Prévisualiser en mode invité"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(inv)}
                                className="p-2 rounded-lg hover:bg-[#F6D6E2]/40 text-[#762747] cursor-pointer"
                                title="Copier le lien privé"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setWhatsAppModalInv(inv)}
                                className="p-2 rounded-lg hover:bg-[#F6D6E2]/40 text-[#A93665] cursor-pointer"
                                title="Préparer le partage WhatsApp"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <Link
                                to={`/admin/invitations/${inv.id}`}
                                className="p-2 rounded-lg hover:bg-[#F6D6E2]/40 text-[#30232B]"
                                title="Modifier l’invitation"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDuplicateInvitation(inv)}
                                className="p-2 rounded-lg hover:bg-[#F6D6E2]/40 text-[#796670] cursor-pointer"
                                title="Dupliquer les paramètres vers une nouvelle invitation"
                              >
                                <CopyPlus className="w-4 h-4" />
                              </button>
                              {inv.status === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmAction({ type: 'revoke', invitation: inv })
                                  }
                                  className="p-2 rounded-lg hover:bg-red-50 text-red-700 cursor-pointer"
                                  title="Révoquer ce lien"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmAction({ type: 'activate', invitation: inv })
                                  }
                                  className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-700 cursor-pointer"
                                  title="Activer ce lien"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================
              SECTION 3: NEW OR EDIT INVITATION FORM (BLOCS A -> F)
             ================================================================ */}
          {(section === 'new_invitation' || section === 'edit_invitation') && (
            <div className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-10 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEDDE5] pb-6">
                <div>
                  <h1 className="font-serif-title text-3xl font-semibold text-[#30232B]">
                    {section === 'new_invitation'
                      ? 'Nouvelle invitation personnalisée'
                      : `Édition : ${currentEditingInv?.displayName || ''}`}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#796670] mt-1">
                    Configurez les événements autorisés et le nombre exact de personnes conviées.
                  </p>
                </div>

                {currentEditingInv && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/invitation/${currentEditingInv.rawTokenForAdminCopy}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FFF8FB] border border-[#EEDDE5] text-xs font-medium text-[#762747]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Prévisualiser</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(currentEditingInv)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FFF8FB] border border-[#EEDDE5] text-xs font-medium text-[#30232B] cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier le lien</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhatsAppModalInv(currentEditingInv)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#A93665] text-white text-xs font-medium cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Partager sur WhatsApp</span>
                    </button>
                  </div>
                )}
              </div>

              {/* BLOC A — IDENTITÉ */}
              <div className="space-y-4">
                <h2 className="font-serif-title text-2xl font-semibold text-[#762747]">
                  Bloc A — Identité &amp; Contact
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="f-display" className="block text-xs font-medium text-[#30232B] mb-1">
                      Nom d’affichage sur le faire-part *
                    </label>
                    <input
                      id="f-display"
                      type="text"
                      value={formDisplayName}
                      onChange={(e) => setFormDisplayName(e.target.value)}
                      placeholder="Ex. : Madame Clarisse / Famille Mbarga"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="f-first" className="block text-xs font-medium text-[#30232B] mb-1">
                      Prénom du contact principal *
                    </label>
                    <input
                      id="f-first"
                      type="text"
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      placeholder="Ex. : Clarisse"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="f-last" className="block text-xs font-medium text-[#30232B] mb-1">
                      Nom du contact principal
                    </label>
                    <input
                      id="f-last"
                      type="text"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      placeholder="Ex. : Nkoa"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="f-phone" className="block text-xs font-medium text-[#30232B] mb-1">
                      Téléphone WhatsApp (facultatif, ex. +2376...)
                    </label>
                    <input
                      id="f-phone"
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+237 6..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="f-email" className="block text-xs font-medium text-[#30232B] mb-1">
                      E-mail (facultatif)
                    </label>
                    <input
                      id="f-email"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="invite@exemple.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="f-internal" className="block text-xs font-medium text-[#30232B] mb-1">
                    Note interne organisateurs (jamais transmise ni visible par l’invité)
                  </label>
                  <input
                    id="f-internal"
                    type="text"
                    value={formInternalNote}
                    onChange={(e) => setFormInternalNote(e.target.value)}
                    placeholder="Ex. : Table d’honneur famille mariée / Collègue direction..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                  />
                </div>
              </div>

              {/* BLOC B — TYPE D’INVITATION */}
              <div className="space-y-4 pt-6 border-t border-[#EEDDE5]">
                <h2 className="font-serif-title text-2xl font-semibold text-[#762747]">
                  Bloc B — Type d’invitation &amp; Règles d’accompagnement
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {(
                    [
                      { id: 'individual', title: 'Individuelle', desc: '1 personne, aucun accompagnant' },
                      { id: 'couple', title: 'Couple nommé', desc: '2 personnes nommées' },
                      { id: 'plus_one', title: 'Avec accompagnant libre', desc: '2 personnes max (+1 au choix)' },
                      { id: 'family', title: 'Familiale', desc: 'Adultes et enfants personnalisés' },
                    ] as { id: InvitationType; title: string; desc: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleTypeChange(opt.id)}
                      className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                        formType === opt.id
                          ? 'bg-[#FFF8FB] border-[#A93665] ring-1 ring-[#A93665]'
                          : 'bg-white border-[#EEDDE5] hover:bg-[#FFF8FB]'
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#30232B]">{opt.title}</p>
                      <p className="text-[11px] text-[#796670] mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {(formType === 'couple' || formType === 'plus_one' || formType === 'family') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label htmlFor="f-sec" className="block text-xs font-medium text-[#30232B] mb-1">
                        Nom de la 2e personne (ou conjoint)
                      </label>
                      <input
                        id="f-sec"
                        type="text"
                        value={formSecondaryName}
                        onChange={(e) => setFormSecondaryName(e.target.value)}
                        placeholder={
                          formType === 'plus_one'
                            ? 'Laisser vide si libre au choix de l’invité'
                            : 'Ex. : Patrick Tchoumi'
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                      />
                    </div>

                    {formType === 'family' && (
                      <>
                        <div>
                          <label htmlFor="f-adults" className="block text-xs font-medium text-[#30232B] mb-1">
                            Nombre maximal d’adultes
                          </label>
                          <input
                            id="f-adults"
                            type="number"
                            min={1}
                            max={15}
                            value={formMaxAdults}
                            onChange={(e) => setFormMaxAdults(Math.max(1, Number(e.target.value)))}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm tabular-nums"
                          />
                        </div>
                        <div>
                          <label htmlFor="f-children" className="block text-xs font-medium text-[#30232B] mb-1">
                            Nombre maximal d’enfants
                          </label>
                          <input
                            id="f-children"
                            type="number"
                            min={0}
                            max={15}
                            value={formMaxChildren}
                            onChange={(e) => setFormMaxChildren(Math.max(0, Number(e.target.value)))}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm tabular-nums"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <p className="text-xs font-medium text-[#762747]">
                  Capacité globale maximale autorisée sur ce lien :{' '}
                  <strong className="tabular-nums">{computedMaxTotal} personne(s)</strong>.
                </p>
              </div>

              {/* BLOC C & D — ÉVÉNEMENTS AUTORISÉS ET CAPACITÉS PAR ÉVÉNEMENT */}
              <div className="space-y-4 pt-6 border-t border-[#EEDDE5]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-serif-title text-2xl font-semibold text-[#762747]">
                      Blocs C &amp; D — Événements autorisés &amp; Capacités par événement
                    </h2>
                    <p className="text-xs text-[#796670]">
                      Les événements non cochés ne seront jamais envoyés au navigateur de cet invité.
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-[#FFF8FB] border border-[#EEDDE5] rounded-full self-start">
                    <button
                      type="button"
                      onClick={() => setFormCapacityMode('simple')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                        formCapacityMode === 'simple'
                          ? 'bg-[#A93665] text-white'
                          : 'text-[#796670]'
                      }`}
                    >
                      Mode simple (même limite)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormCapacityMode('advanced')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                        formCapacityMode === 'advanced'
                          ? 'bg-[#A93665] text-white'
                          : 'text-[#796670]'
                      }`}
                    >
                      Mode avancé (par événement)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ALL_EVENTS.map((ev) => {
                    const acc = formEventAccess[ev.id] || { enabled: false, allowedSeats: computedMaxTotal };
                    return (
                      <div
                        key={ev.id}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                          acc.enabled
                            ? 'bg-[#FFF8FB] border-[#A93665]'
                            : 'bg-white border-[#EEDDE5] opacity-75'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={acc.enabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormEventAccess((prev) => ({
                                ...prev,
                                [ev.id]: {
                                  enabled: checked,
                                  allowedSeats: checked ? computedMaxTotal : 0,
                                },
                              }));
                            }}
                            className="w-4 h-4 accent-[#A93665]"
                          />
                          <span className="text-xs sm:text-sm font-medium text-[#30232B]">
                            {ev.labelFr}
                          </span>
                        </label>

                        {acc.enabled && formCapacityMode === 'advanced' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <label
                              htmlFor={`seats-${ev.id}`}
                              className="text-[11px] text-[#796670]"
                            >
                              Places max :
                            </label>
                            <input
                              id={`seats-${ev.id}`}
                              type="number"
                              min={1}
                              max={computedMaxTotal}
                              value={Math.min(acc.allowedSeats || computedMaxTotal, computedMaxTotal)}
                              onChange={(e) => {
                                const val = Math.min(
                                  computedMaxTotal,
                                  Math.max(1, Number(e.target.value) || 1)
                                );
                                setFormEventAccess((prev) => ({
                                  ...prev,
                                  [ev.id]: { ...prev[ev.id], allowedSeats: val },
                                }));
                              }}
                              className="w-16 px-2.5 py-1.5 rounded-lg bg-white border border-[#EEDDE5] text-xs tabular-nums"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BLOC E — PERSONNALISATION */}
              <div className="space-y-4 pt-6 border-t border-[#EEDDE5]">
                <h2 className="font-serif-title text-2xl font-semibold text-[#762747]">
                  Bloc E — Salutation &amp; Personnalisation
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="f-greet-fr" className="block text-xs font-medium text-[#30232B] mb-1">
                      Salutation personnalisée (FR) — laisser vide pour formule automatique
                    </label>
                    <textarea
                      id="f-greet-fr"
                      rows={2}
                      value={formGreetingFr}
                      onChange={(e) => setFormGreetingFr(e.target.value)}
                      placeholder="Ex. : Chère Madame Clarisse, nous serions heureux de vous compter parmi nous."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="f-note-fr" className="block text-xs font-medium text-[#30232B] mb-1">
                      Petit mot personnel des mariés (FR, facultatif)
                    </label>
                    <textarea
                      id="f-note-fr"
                      rows={2}
                      value={formPersonalNoteFr}
                      onChange={(e) => setFormPersonalNoteFr(e.target.value)}
                      placeholder="Un message chaleureux affiché sous la salutation..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="f-lang" className="block text-xs font-medium text-[#30232B] mb-1">
                      Langue préférée par défaut
                    </label>
                    <select
                      id="f-lang"
                      value={formPreferredLang}
                      onChange={(e) => setFormPreferredLang(e.target.value === 'en' ? 'en' : 'fr')}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                    >
                      <option value="fr">Français (FR)</option>
                      <option value="en">English (EN)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs text-[#30232B] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAccessCodeRequired}
                        onChange={(e) => setFormAccessCodeRequired(e.target.checked)}
                        className="accent-[#A93665]"
                      />
                      <span>Protéger le lien par un code PIN séparé</span>
                    </label>
                  </div>

                  {formAccessCodeRequired && (
                    <div>
                      <label htmlFor="f-pin" className="block text-xs font-medium text-[#30232B] mb-1">
                        Code PIN secret à communiquer à l’invité
                      </label>
                      <input
                        id="f-pin"
                        type="text"
                        value={formAccessPin}
                        onChange={(e) => setFormAccessPin(e.target.value)}
                        placeholder="Ex. : 2026"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
                  {formError}
                </div>
              )}

              {/* BLOC F — ACTIONS */}
              <div className="pt-6 border-t border-[#EEDDE5] flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={formSaving}
                    onClick={() => handleSaveInvitation('draft')}
                    className="px-5 py-2.5 rounded-full bg-[#FFF8FB] hover:bg-[#F6D6E2]/40 border border-[#EEDDE5] text-xs font-medium text-[#30232B] cursor-pointer"
                  >
                    Enregistrer en brouillon
                  </button>
                  <button
                    type="button"
                    disabled={formSaving}
                    onClick={() => handleSaveInvitation('active')}
                    className="px-6 py-2.5 rounded-full bg-[#A93665] hover:bg-[#762747] text-white text-xs sm:text-sm font-medium cursor-pointer"
                  >
                    {section === 'new_invitation'
                      ? 'Activer l’invitation & Générer le lien privé'
                      : 'Enregistrer les modifications (sans changer le lien)'}
                  </button>
                </div>

                {currentEditingInv && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmAction({ type: 'rotate', invitation: currentEditingInv })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Régénérer le lien (invalider l’ancien)</span>
                    </button>
                    {currentEditingInv.status !== 'revoked' && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({ type: 'revoke', invitation: currentEditingInv })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-medium cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Révoquer l’invitation</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              SECTION 4: LES 5 ÉVÉNEMENTS (Venue, Address & Confirmation Admin)
             ================================================================ */}
          {section === 'events' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-8">
                <h1 className="font-serif-title text-3xl font-semibold text-[#30232B]">
                  Configuration des 5 événements du 1er décembre 2026
                </h1>
                <p className="text-xs sm:text-sm text-[#796670] mt-1">
                  Renseignez les adresses exactes (église, domicile à Simbock, vin d’honneur, grande soirée) et activez le bouton itinéraire dès qu’un lieu est confirmé.
                </p>
              </div>

              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-8 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEDDE5] pb-4">
                    <div>
                      <span className="text-xs font-mono text-[#A93665]">{ev.id}</span>
                      <h2 className="font-serif-title text-2xl font-semibold text-[#30232B]">
                        {ev.titleFr}
                      </h2>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-medium text-[#30232B] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ev.isAddressConfirmed}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEvents((prev) =>
                            prev.map((item) =>
                              item.id === ev.id
                                ? { ...item, isAddressConfirmed: checked }
                                : item
                            )
                          );
                        }}
                        className="w-4 h-4 accent-[#A93665]"
                      />
                      <span>Lieu précis validé (active le bouton Itinéraire Maps)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#30232B] mb-1">
                        Horaire affiché (FR)
                      </label>
                      <input
                        type="text"
                        value={ev.timeLabelFr}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEvents((prev) =>
                            prev.map((item) =>
                              item.id === ev.id ? { ...item, timeLabelFr: val } : item
                            )
                          );
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#30232B] mb-1">
                        Nom du lieu (FR)
                      </label>
                      <input
                        type="text"
                        value={ev.venueNameFr}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEvents((prev) =>
                            prev.map((item) =>
                              item.id === ev.id ? { ...item, venueNameFr: val } : item
                            )
                          );
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#30232B] mb-1">
                        Lien Google Maps (si validé)
                      </label>
                      <input
                        type="url"
                        value={ev.mapUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEvents((prev) =>
                            prev.map((item) =>
                              item.id === ev.id ? { ...item, mapUrl: val || null } : item
                            )
                          );
                        }}
                        placeholder="https://www.google.com/maps/..."
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#30232B] mb-1">
                        Adresse / Indication d’accès (FR)
                      </label>
                      <input
                        type="text"
                        value={ev.addressFr}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEvents((prev) =>
                            prev.map((item) =>
                              item.id === ev.id ? { ...item, addressFr: val } : item
                            )
                          );
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#30232B] mb-1">
                        Dress code (FR)
                      </label>
                      <input
                        type="text"
                        value={ev.dressCodeFr}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEvents((prev) =>
                            prev.map((item) =>
                              item.id === ev.id ? { ...item, dressCodeFr: val } : item
                            )
                          );
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleUpdateEvent(ev)}
                      className="px-5 py-2 rounded-full bg-[#A93665] hover:bg-[#762747] text-white text-xs font-medium cursor-pointer"
                    >
                      Enregistrer cet événement
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ================================================================
              SECTION 5: DETAILED RESPONSES & DIETARY NEEDS
             ================================================================ */}
          {section === 'responses' && (
            <div className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-serif-title text-3xl font-semibold text-[#30232B]">
                    Réponses détaillées &amp; Besoins particuliers
                  </h1>
                  <p className="text-xs text-[#796670] mt-1">
                    Suivi nominatif par personne et par événement, préférences alimentaires et besoins d’accès.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {invitations
                  .filter((i) => i.respondedAt)
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="p-5 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-serif-title text-xl font-semibold text-[#30232B]">
                            {inv.displayName}
                          </p>
                          <p className="text-xs text-[#796670]">
                            Répondu le {formatDate(inv.respondedAt || '')}
                          </p>
                        </div>
                        <Link
                          to={`/admin/invitations/${inv.id}`}
                          className="text-xs font-medium text-[#A93665] hover:underline"
                        >
                          Ouvrir la fiche →
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {inv.people.map((p) => {
                          const pResps = inv.responses.filter((r) => r.personId === p.id);
                          return (
                            <div
                              key={p.id}
                              className="p-3 rounded-xl bg-white border border-[#EEDDE5]"
                            >
                              <p className="font-semibold text-[#30232B]">{p.fullName}</p>
                              <p className="text-[#796670] mt-1">
                                {pResps
                                  .map((r) => {
                                    const evLabel =
                                      ALL_EVENTS.find((e) => e.id === r.eventId)?.labelFr.split(
                                        ' ('
                                      )[0] || r.eventId;
                                    const statusStr =
                                      r.attendance === 'yes'
                                        ? 'Oui'
                                        : r.attendance === 'no'
                                        ? 'Non'
                                        : 'À confirmer';
                                    return `${evLabel}: ${statusStr}`;
                                  })
                                  .join(' · ')}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {(inv.dietaryNotes || inv.accessNeedNotes || inv.messageToCouple) && (
                        <div className="pt-2 border-t border-[#EEDDE5] text-xs space-y-1">
                          {inv.dietaryNotes && (
                            <p>
                              <strong className="text-[#762747]">Régime / Allergies :</strong>{' '}
                              {inv.dietaryNotes}
                            </p>
                          )}
                          {inv.accessNeedNotes && (
                            <p>
                              <strong className="text-[#762747]">Accès / Accueil :</strong>{' '}
                              {inv.accessNeedNotes}
                            </p>
                          )}
                          {inv.messageToCouple && (
                            <p>
                              <strong className="text-[#762747]">Mot aux mariés :</strong> «{' '}
                              {inv.messageToCouple} »
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ================================================================
              SECTION 6: MEMORIES & WISHES MODERATION + AUDIT LOGS
             ================================================================ */}
          {section === 'memories' && (
            <div className="space-y-8">
              <div className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-8 space-y-6">
                <h1 className="font-serif-title text-3xl font-semibold text-[#30232B]">
                  Modération des Photos &amp; Livre de vœux
                </h1>

                <div className="space-y-4">
                  <h2 className="font-serif-title text-xl font-semibold text-[#762747]">
                    Photos soumises ({photos.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="p-4 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] flex flex-col justify-between gap-3"
                      >
                        <div>
                          <img
                            src={photo.dataUrl}
                            alt={photo.caption}
                            className="w-full h-40 object-cover rounded-xl border border-[#EEDDE5]"
                          />
                          <p className="text-xs font-semibold text-[#30232B] mt-2">
                            {photo.contributorName}
                          </p>
                          {photo.caption && (
                            <p className="text-xs text-[#796670] mt-0.5">{photo.caption}</p>
                          )}
                          <p className="text-[11px] text-[#A93665] mt-1">
                            Statut : {photo.moderationStatus} · Portée :{' '}
                            {photo.eventId ? photo.eventId : 'Album commun'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleModerate('photo', photo.id, 'approved')}
                            className="flex-1 py-1.5 rounded-full bg-emerald-700 text-white text-xs font-medium cursor-pointer"
                          >
                            Approuver
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModerate('photo', photo.id, 'rejected')}
                            className="flex-1 py-1.5 rounded-full bg-red-100 text-red-800 text-xs font-medium cursor-pointer"
                          >
                            Rejeter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-[#EEDDE5]">
                  <h2 className="font-serif-title text-xl font-semibold text-[#762747]">
                    Messages du livre de vœux ({wishes.length})
                  </h2>
                  <div className="space-y-3">
                    {wishes.map((w) => (
                      <div
                        key={w.id}
                        className="p-4 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-xs font-semibold text-[#30232B]">
                            {w.authorName} ·{' '}
                            <span className="text-[#A93665]">{w.moderationStatus}</span>
                          </p>
                          <p className="text-xs text-[#796670] mt-1">« {w.message} »</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleModerate('wish', w.id, 'approved')}
                            className="px-3.5 py-1.5 rounded-full bg-emerald-700 text-white text-xs font-medium cursor-pointer"
                          >
                            Approuver
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModerate('wish', w.id, 'rejected')}
                            className="px-3.5 py-1.5 rounded-full bg-red-100 text-red-800 text-xs font-medium cursor-pointer"
                          >
                            Masquer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Journal d'audit de sécurité */}
              <div className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-8 space-y-4">
                <h2 className="font-serif-title text-2xl font-semibold text-[#30232B]">
                  Journal d’audit des actions sensibles
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="py-2 border-b border-[#EEDDE5]/60 flex flex-wrap items-center justify-between gap-2"
                    >
                      <span>
                        <strong className="text-[#762747]">{log.action}</strong> — {log.details}
                      </span>
                      <span className="text-[#796670] tabular-nums">
                        {log.actorLabel} ({log.actorRole}) · {formatDate(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ====================================================================
          WHATSAPP SHARE PREPARATION MODAL (Section 13 compliant)
         ==================================================================== */}
      {whatsAppModalInv && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-lg w-full bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <h3 className="font-serif-title text-2xl font-semibold text-[#30232B]">
              Partage WhatsApp — {whatsAppModalInv.displayName}
            </h3>
            <p className="text-xs text-[#796670]">
              Ce message ne dévoile aucun programme non autorisé. Vous envoyez vous-même le message dans WhatsApp.
            </p>

            {(() => {
              const privateUrl = `${window.location.origin}/invitation/${whatsAppModalInv.rawTokenForAdminCopy}`;
              const messageText = `Bonjour ${whatsAppModalInv.displayName},\n\nJoseph et Marie ont le plaisir de vous inviter à partager la célébration de leur mariage, le mardi 1er décembre 2026.\n\nDécouvrez votre invitation personnelle et confirmez votre présence ici :\n${privateUrl}\n\nNous serons heureux de partager ce moment avec vous.`;
              const cleanPhone = (whatsAppModalInv.phone || '').replace(/[^0-9]/g, '');
              const waUrl = cleanPhone
                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
                : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

              return (
                <>
                  <textarea
                    readOnly
                    rows={7}
                    value={messageText}
                    className="w-full p-4 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] text-xs text-[#30232B] leading-relaxed"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(messageText);
                        handleMarkWhatsAppStatus(whatsAppModalInv, 'prepared');
                        showToast('Message WhatsApp copié dans le presse-papiers.');
                      }}
                      className="px-4 py-2.5 rounded-full bg-[#FFF8FB] border border-[#EEDDE5] text-xs font-medium text-[#30232B] cursor-pointer"
                    >
                      Copier le message
                    </button>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleMarkWhatsAppStatus(whatsAppModalInv, 'declared_sent')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#A93665] hover:bg-[#762747] text-white text-xs font-medium"
                    >
                      <span>Ouvrir dans WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </>
              );
            })()}

            <div className="pt-3 border-t border-[#EEDDE5] flex justify-end">
              <button
                type="button"
                onClick={() => setWhatsAppModalInv(null)}
                className="text-xs text-[#796670] hover:text-[#30232B] cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SENSITIVE ACTION CONFIRMATION MODAL (Revoke / Token Rotation)
         ==================================================================== */}
      {confirmAction && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-serif-title text-2xl font-semibold text-[#30232B]">
                Confirmation requise
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-[#796670] leading-relaxed">
              {confirmAction.type === 'rotate' &&
                `Voulez-vous vraiment régénérer le lien secret de « ${confirmAction.invitation.displayName} » ? L’ancien lien cessera immédiatement de fonctionner.`}
              {confirmAction.type === 'revoke' &&
                `Voulez-vous vraiment révoquer l’invitation de « ${confirmAction.invitation.displayName} » ? Son lien affichera désormais une page d’indisponibilité.`}
              {confirmAction.type === 'activate' &&
                `Voulez-vous réactiver le lien d’invitation de « ${confirmAction.invitation.displayName} » ?`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-full border border-[#EEDDE5] text-xs font-medium text-[#796670] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                className="px-5 py-2 rounded-full bg-[#A93665] hover:bg-[#762747] text-white text-xs font-medium cursor-pointer"
              >
                Confirmer l’action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
