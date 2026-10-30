import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  MapPin,
  Download,
  CheckCircle2,
  Camera,
  Heart,
  Lock,
  ExternalLink,
  AlertCircle,
  Users,
  Shirt,
  Upload,
  X,
  MailOpen,
} from 'lucide-react';
import { HeaderBubble, NavItem } from '../components/HeaderBubble.tsx';
import { Footer } from '../components/Footer.tsx';
import { FloralDivider } from '../components/FloralDivider.tsx';
import { Envelope3DOverlay } from '../components/Envelope3DOverlay.tsx';
import { useI18n } from '../i18n/I18nContext.tsx';
import {
  AttendanceChoice,
  EventId,
  GuestInvitationView,
  GuestWishMessage,
  SharedMemoryPhoto,
} from '../types/wedding.ts';

interface PrivateInvitationPageProps {
  focusRsvpOnMount?: boolean;
  initialSection?: string;
}

/**
 * Strips EXIF / GPS metadata and resizes image client-side using HTML5 Canvas
 * before sending to server storage.
 */
async function stripExifAndCompressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Re-encoding via canvas strips all EXIF/GPS metadata
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

export const PrivateInvitationPage: React.FC<PrivateInvitationPageProps> = ({
  focusRsvpOnMount = false,
  initialSection,
}) => {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const { lang, setLang, t, formatDate } = useI18n();

  const [loading, setLoading] = useState(true);
  const [invalidOrRevoked, setInvalidOrRevoked] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [invitation, setInvitation] = useState<GuestInvitationView | null>(null);

  // Envelope intro animation (ignorable, non-blocking, once per session)
  const [envelopeOpen, setEnvelopeOpen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(`jm_env_${token}`) === '1';
    } catch {
      return true;
    }
  });

  // RSVP form state
  const [peopleState, setPeopleState] = useState<{ id: string; fullName: string; isChild: boolean; isPlusOne: boolean }[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceChoice>>({});
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [accessNeedNotes, setAccessNeedNotes] = useState('');
  const [messageToCouple, setMessageToCouple] = useState('');
  const [rsvpSaving, setRsvpSaving] = useState(false);
  const [rsvpError, setRsvpError] = useState('');
  const [rsvpSavedMessage, setRsvpSavedMessage] = useState('');

  // Memories & Wishes state
  const [activeMemoryTab, setActiveMemoryTab] = useState<'album' | 'upload' | 'wishes'>('album');
  const [photos, setPhotos] = useState<SharedMemoryPhoto[]>([]);
  const [wishes, setWishes] = useState<GuestWishMessage[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<SharedMemoryPhoto | null>(null);

  // Upload photo form
  const [uploadName, setUploadName] = useState('');
  const [uploadEventId, setUploadEventId] = useState<string>('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadConsent, setUploadConsent] = useState(false);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');

  // Wish form
  const [wishAuthor, setWishAuthor] = useState('');
  const [wishMessage, setWishMessage] = useState('');
  const [wishPublic, setWishPublic] = useState(true);
  const [wishSending, setWishSending] = useState(false);
  const [wishSuccessMsg, setWishSuccessMsg] = useState('');

  // Set generic privacy-safe title & meta noindex
  useEffect(() => {
    document.title = t.meta.privateTitle;
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', 'noindex, nofollow');

    return () => {
      if (metaRobots) {
        metaRobots.setAttribute('content', 'index, follow');
      }
    };
  }, [t.meta.privateTitle]);

  const loadInvitation = async (pinToUse?: string) => {
    if (!token) {
      setInvalidOrRevoked(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setPinError('');
    try {
      const q = pinToUse ? `?pin=${encodeURIComponent(pinToUse)}` : '';
      const res = await fetch(`/api/invitation/${encodeURIComponent(token)}${q}`);
      if (res.status === 404) {
        setInvalidOrRevoked(true);
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        setRequiresPin(true);
        if (pinToUse) {
          setPinError(lang === 'fr' ? 'Code d’accès incorrect.' : 'Incorrect access code.');
        }
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setInvalidOrRevoked(true);
        setLoading(false);
        return;
      }

      const data: GuestInvitationView = await res.json();
      setInvitation(data);
      setRequiresPin(false);
      setInvalidOrRevoked(false);

      // Initialize form fields from server state without losing user edits
      setPeopleState(data.people.map((p) => ({ ...p })));
      const map: Record<string, AttendanceChoice> = {};
      for (const p of data.people) {
        for (const ev of data.authorizedEvents) {
          const found = data.responses.find((r) => r.personId === p.id && r.eventId === ev.id);
          map[`${p.id}:${ev.id}`] = found ? found.attendance : 'yes';
        }
      }
      setAttendanceMap(map);
      setDietaryNotes(data.dietaryNotes || '');
      setAccessNeedNotes(data.accessNeedNotes || '');
      setMessageToCouple(data.messageToCouple || '');
      setUploadName(data.displayName);
      setWishAuthor(data.displayName);

      // Also load approved memories & wishes visible to this invitation
      const memRes = await fetch(`/api/invitation/${encodeURIComponent(token)}/memories${q}`);
      if (memRes.ok) {
        const memData = await memRes.json();
        setPhotos(memData.photos || []);
        setWishes(memData.wishes || []);
      }
    } catch {
      setInvalidOrRevoked(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitation();
  }, [token]);

  useEffect(() => {
    const targetSection = initialSection || (focusRsvpOnMount ? 'rsvp' : '');
    if (targetSection && !loading && invitation) {
      setEnvelopeOpen(true);
      const timer = setTimeout(() => {
        const el = document.getElementById(targetSection);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [focusRsvpOnMount, initialSection, loading, invitation, location.pathname]);

  const handleOpenEnvelope = () => {
    setEnvelopeOpen(true);
    try {
      sessionStorage.setItem(`jm_env_${token}`, '1');
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF8FB] px-4">
        <div className="w-14 h-14 rounded-full border-2 border-[#EBAFC5] border-t-[#A93665] animate-spin" />
        <p className="font-serif-title text-2xl text-[#762747] mt-4">
          Joseph &amp; Marie
        </p>
      </div>
    );
  }

  // Non-revealing error page for invalid, revoked, or expired tokens
  if (invalidOrRevoked) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FFF8FB] text-[#30232B]">
        <HeaderBubble navItems={[{ label: t.nav.home, href: '/' }]} />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-lg w-full bg-white border border-[#EEDDE5] rounded-3xl p-8 sm:p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] text-[#A93665] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-serif-title text-3xl font-semibold text-[#30232B] mt-5">
              {t.errors.invalidLinkTitle}
            </h1>
            <p className="text-sm sm:text-base text-[#796670] mt-3 leading-relaxed">
              {t.errors.invalidLinkBody}
            </p>
            <div className="mt-8">
              <Link
                to="/"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-[#A93665] hover:bg-[#762747] rounded-full transition-colors"
              >
                {t.errors.backToPublic}
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (requiresPin && !invitation) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FFF8FB] text-[#30232B]">
        <HeaderBubble navItems={[{ label: t.nav.home, href: '/' }]} />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadInvitation(pinInput);
            }}
            className="max-w-md w-full bg-white border border-[#EEDDE5] rounded-3xl p-8 sm:p-10 shadow-sm"
          >
            <h1 className="font-serif-title text-3xl font-semibold text-[#30232B]">
              {t.rsvp.pinRequiredTitle}
            </h1>
            <p className="text-sm text-[#796670] mt-2">
              {t.rsvp.pinRequiredSubtitle}
            </p>
            <div className="mt-6">
              <label htmlFor="pin-input" className="block text-xs font-medium text-[#30232B] mb-2">
                {t.rsvp.pinLabel}
              </label>
              <input
                id="pin-input"
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-[#EEDDE5] bg-[#FFF8FB] text-[#30232B] focus:outline-none focus:border-[#A93665]"
              />
              {pinError && (
                <p className="text-xs text-red-700 mt-2">{pinError}</p>
              )}
            </div>
            <button
              type="submit"
              className="mt-6 w-full py-3 px-6 rounded-full bg-[#A93665] hover:bg-[#762747] text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {t.rsvp.pinSubmit}
            </button>
          </form>
        </main>
        <Footer />
      </div>
    );
  }

  if (!invitation) return null;

  // Dynamic Navigation: ONLY sections available to this guest
  const navItems: NavItem[] = [
    { label: t.nav.home, href: '#accueil-invite' },
    { label: t.nav.program, href: '#programme' },
    { label: t.nav.dressCode, href: '#tenue' },
    { label: t.nav.rsvp, href: '#rsvp' },
    { label: t.nav.memories, href: '#souvenirs' },
  ];

  // Build Personalized Greeting
  const getPersonalizedGreeting = () => {
    const custom = lang === 'fr' ? invitation.customGreetingFr : invitation.customGreetingEn;
    if (custom && custom.trim()) return custom;

    if (invitation.invitationType === 'couple') {
      return t.invitation.defaultGreetingCouple
        .replace('{name1}', invitation.primaryFirstName)
        .replace('{name2}', invitation.secondaryPersonName || '');
    }
    if (invitation.invitationType === 'plus_one') {
      return t.invitation.defaultGreetingPlusOne.replace('{name}', invitation.displayName);
    }
    if (invitation.invitationType === 'family') {
      return t.invitation.defaultGreetingFamily.replace('{name}', invitation.displayName);
    }
    return t.invitation.defaultGreetingIndividual.replace('{name}', invitation.displayName);
  };

  const personalNote = lang === 'fr' ? invitation.personalNoteFr : invitation.personalNoteEn;

  const isDeadlinePassed =
    invitation.rsvpDeadline ? new Date(invitation.rsvpDeadline).getTime() < Date.now() : false;

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setRsvpSaving(true);
    setRsvpError('');
    setRsvpSavedMessage('');

    try {
      const responsesPayload: { personId: string; eventId: EventId; attendance: AttendanceChoice }[] = [];

      for (const ev of invitation.authorizedEvents) {
        // Respect per-event seat limit: only submit up to ev.allowedSeats people
        const eligiblePeople = peopleState.slice(0, ev.allowedSeats);
        for (const p of eligiblePeople) {
          const choice = attendanceMap[`${p.id}:${ev.id}`] || 'yes';
          responsesPayload.push({
            personId: p.id,
            eventId: ev.id,
            attendance: choice,
          });
        }
      }

      const res = await fetch(`/api/invitation/${encodeURIComponent(token)}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          people: peopleState.map((p) => ({ id: p.id, fullName: p.fullName })),
          responses: responsesPayload,
          dietaryNotes,
          accessNeedNotes,
          messageToCouple,
          pin: pinInput || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRsvpError(data.error || 'Une erreur est survenue lors de la validation.');
      } else {
        setInvitation(data);
        setRsvpSavedMessage(t.rsvp.savedSuccess);
      }
    } catch {
      setRsvpError('Impossible de joindre le serveur. Veuillez vérifier votre connexion.');
    } finally {
      setRsvpSaving(false);
    }
  };

  const handlePhotoFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    setUploadErrorMsg('');
    const selected = Array.from(fileList).slice(0, 10);

    const compressed: string[] = [];
    for (const file of selected) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setUploadErrorMsg('Seuls les formats JPEG, PNG et WebP sont acceptés.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadErrorMsg('Chaque fichier ne doit pas dépasser 10 Mo.');
        return;
      }
      try {
        const dataUrl = await stripExifAndCompressImage(file);
        compressed.push(dataUrl);
      } catch {
        setUploadErrorMsg('Erreur lors de la lecture d’une image.');
      }
    }
    setUploadPreviews(compressed);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || uploadPreviews.length === 0) return;
    setUploadingPhotos(true);
    setUploadErrorMsg('');
    setUploadStatusMsg('');
    try {
      const res = await fetch(`/api/invitation/${encodeURIComponent(token)}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributorName: uploadName,
          eventId: uploadEventId || null,
          caption: uploadCaption,
          consentGiven: uploadConsent,
          files: uploadPreviews,
          pin: pinInput || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadErrorMsg(data.error || 'Erreur lors de l’envoi.');
      } else {
        setUploadStatusMsg(t.memories.uploadSuccess);
        setUploadPreviews([]);
        setUploadCaption('');
        // Refresh guest's own photos immediately so they see their uploaded photos right away
        const q = pinInput ? `?pin=${encodeURIComponent(pinInput)}` : '';
        const memRes = await fetch(`/api/invitation/${encodeURIComponent(token)}/memories${q}`);
        if (memRes.ok) {
          const memData = await memRes.json();
          setPhotos(memData.photos || []);
          setWishes(memData.wishes || []);
        }
      }
    } catch {
      setUploadErrorMsg('Erreur réseau lors de l’envoi des photos.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleWishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !wishMessage.trim()) return;
    setWishSending(true);
    setWishSuccessMsg('');
    try {
      const res = await fetch(`/api/invitation/${encodeURIComponent(token)}/wishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: wishAuthor,
          message: wishMessage,
          isPublicWish: wishPublic,
          pin: pinInput || undefined,
        }),
      });
      if (res.ok) {
        setWishSuccessMsg(t.memories.wishSuccess);
        setWishMessage('');
      }
    } finally {
      setWishSending(false);
    }
  };

  const hasEveningAccess = invitation.authorizedEvents.some((e) => e.id === 'evening');

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8FB] text-[#30232B]">
      {/* 3D Pop-up Envelope with Pink Neon Circumference "Ouvrir" Button */}
      <Envelope3DOverlay
        isOpen={envelopeOpen}
        onOpen={handleOpenEnvelope}
        guestSubtitle={invitation.displayName}
      />

      <HeaderBubble
        navItems={navItems}
        ctaLabel={
          invitation.respondedAt
            ? t.invitation.updateResponseButton
            : t.invitation.confirmButton
        }
        ctaHref="#rsvp"
      />

      <main className="flex-1">
        {/* FULL-SCREEN PERSONALIZED GUEST WELCOME HERO WITH COUPLE BACKGROUND & SEMI-TRANSPARENT BLACK OVERLAY */}
        <section id="accueil-invite" className="relative w-full min-h-[100dvh] flex items-center justify-center overflow-hidden">
          {/* Couple Background Image */}
          <img
            src="/assets/aistudio/Portrait_de_mariage_romantique_et__l_gant_0c88a360.png"
            alt="Joseph et Marie"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Semi-transparent black overlay so the couple photo behind is clearly visible */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/58 backdrop-blur-[1px]"
          />

          <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16 lg:py-28">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center text-white"
            >
              <div className="lg:col-span-7 space-y-4 sm:space-y-5">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-[#F6D6E2]">
                  <span>{t.invitation.kicker}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t.invitation.dateFull}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t.publicPage.themeBadge}</span>
                </div>

                <h1
                  className="font-serif-title text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-white drop-shadow-sm"
                  style={{ textWrap: 'balance' }}
                >
                  Joseph &amp; Marie
                </h1>

                <div className="p-4 sm:p-6 rounded-2xl bg-black/45 backdrop-blur-md border border-[#F6D6E2]/35">
                  <p className="font-serif-title text-lg sm:text-2xl md:text-3xl text-[#F6D6E2] whitespace-pre-line leading-snug">
                    {getPersonalizedGreeting()}
                  </p>
                  {personalNote && (
                    <p className="text-xs sm:text-sm text-white/90 mt-2.5 sm:mt-3 leading-relaxed">
                      {personalNote}
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-xs sm:text-base text-white/90 leading-relaxed">
                  <p>{t.publicPage.editorialP1}</p>
                  <p>{t.publicPage.editorialP2}</p>
                </div>

                <div className="pt-4 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#F6D6E2]">
                    <Users className="w-4 h-4 text-[#EBAFC5] shrink-0" />
                    <span className="tabular-nums">
                      {invitation.capacityMode === 'advanced'
                        ? t.invitation.seatsByEventNotice.replace('{count}', String(invitation.maxTotal))
                        : invitation.maxTotal === 1
                        ? t.invitation.seatsNoticeSingular
                        : t.invitation.seatsNoticePlural.replace('{count}', String(invitation.maxTotal))}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                    <a
                      href="#rsvp"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center justify-center px-6 py-3 text-xs sm:text-sm font-medium text-white bg-[#A93665] hover:bg-[#762747] rounded-full transition-colors whitespace-nowrap shrink-0 shadow-md cursor-pointer"
                    >
                      {invitation.respondedAt
                        ? t.invitation.updateResponseButton
                        : t.invitation.confirmButton}
                    </a>
                    <button
                      type="button"
                      onClick={() => setEnvelopeOpen(false)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 rounded-full transition-colors cursor-pointer"
                    >
                      <MailOpen className="w-4 h-4 text-[#F6D6E2] shrink-0" />
                      <span>{lang === 'fr' ? 'Revoir l’enveloppe 3D' : 'Replay 3D Envelope'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column Summary Card */}
              <div className="lg:col-span-5">
                <div className="bg-black/45 backdrop-blur-md border border-[#F6D6E2]/35 rounded-3xl p-5 sm:p-7 space-y-4 sm:space-y-5 text-white">
                  <div className="flex items-center gap-3.5 sm:gap-4">
                    <img
                      src="/assets/aistudio/Alliance_dor_es_entrelac_es_lumineuses_41789553.png"
                      alt="Alliances de mariage"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 border border-[#F6D6E2]/40"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#F6D6E2]">
                        {t.invitation.programSubtitle}
                      </p>
                      <p className="font-serif-title text-xl sm:text-2xl font-semibold text-white mt-0.5 truncate">
                        {invitation.displayName}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/20 space-y-2.5">
                    {invitation.authorizedEvents.map((ev) => (
                      <div key={ev.id} className="flex items-start justify-between gap-2 text-xs sm:text-sm">
                        <span className="font-medium text-white">
                          {lang === 'fr' ? ev.titleFr : ev.titleEn}
                        </span>
                        <span className="text-[#F6D6E2] tabular-nums shrink-0">
                          {lang === 'fr' ? ev.timeLabelFr : ev.timeLabelEn}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <FloralDivider />

        {/* AUTHORIZED PROGRAM SECTION — Zero holes, zero unauthorized events */}
        <section id="programme" className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-medium text-[#A93665] tracking-wider">
                {t.invitation.programSubtitle}
              </p>
              <h2 className="font-serif-title text-3xl sm:text-4xl font-semibold text-[#30232B] mt-1">
                {t.invitation.programTitle}
              </h2>
            </div>

            {token && (
              <a
                href={`/api/invitation/${encodeURIComponent(token)}/ics?lang=${lang}${
                  pinInput ? `&pin=${encodeURIComponent(pinInput)}` : ''
                }`}
                download
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#762747] bg-white hover:bg-[#F6D6E2]/40 border border-[#EEDDE5] rounded-full transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4 text-[#A93665]" />
                <span>{t.invitation.exportCalendarAll}</span>
              </a>
            )}
          </div>

          <div className="space-y-6">
            {invitation.authorizedEvents.map((ev) => {
              const title = lang === 'fr' ? ev.titleFr : ev.titleEn;
              const timeLabel = lang === 'fr' ? ev.timeLabelFr : ev.timeLabelEn;
              const endLabel = lang === 'fr' ? ev.endLabelFr : ev.endLabelEn;
              const venueName = lang === 'fr' ? ev.venueNameFr : ev.venueNameEn;
              const address = lang === 'fr' ? ev.addressFr : ev.addressEn;
              const statusNote = lang === 'fr' ? ev.venueStatusNoteFr : ev.venueStatusNoteEn;
              const description = lang === 'fr' ? ev.descriptionFr : ev.descriptionEn;
              const dressCode = lang === 'fr' ? ev.dressCodeFr : ev.dressCodeEn;
              const notes = lang === 'fr' ? ev.notesFr : ev.notesEn;

              return (
                <article
                  key={ev.id}
                  className="bg-white border border-[#EEDDE5] rounded-3xl p-6 sm:p-9 shadow-[0_8px_30px_rgb(118,39,71,0.03)]"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#A93665]">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>{timeLabel}</span>
                        {endLabel && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{endLabel}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="text-[#796670] tabular-nums">
                          {t.invitation.allowedSeatsForEvent.replace(
                            '{count}',
                            String(ev.allowedSeats)
                          )}
                        </span>
                      </div>

                      <h3 className="font-serif-title text-2xl sm:text-3xl font-semibold text-[#30232B]">
                        {title}
                      </h3>

                      <p className="text-sm sm:text-base text-[#30232B] leading-relaxed">
                        {description}
                      </p>

                      {notes && notes.length > 0 && (
                        <ul className="space-y-1.5 pt-2 text-xs sm:text-sm text-[#796670]">
                          {notes.map((n, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[#A93665] font-bold">·</span>
                              <span>{n}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Venue & Action Box */}
                    <div className="md:w-80 shrink-0 p-5 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] space-y-3">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-[#A93665] shrink-0 mt-1" />
                        <div>
                          <p className="text-sm font-semibold text-[#30232B]">{venueName}</p>
                          <p className="text-xs text-[#796670] mt-1 leading-relaxed">{address}</p>
                          {statusNote && (
                            <p className="text-[11px] text-[#762747] mt-1.5 italic">
                              {statusNote}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#EEDDE5] flex items-start gap-2.5">
                        <Shirt className="w-4 h-4 text-[#A93665] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#30232B]">{dressCode}</p>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {ev.isAddressConfirmed && ev.mapUrl ? (
                          <a
                            href={ev.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#A93665] hover:bg-[#762747] rounded-full transition-colors whitespace-nowrap"
                          >
                            <span>{t.invitation.openItinerary}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs text-[#796670] bg-white border border-[#EEDDE5] rounded-full">
                            {t.invitation.locationPending}
                          </span>
                        )}

                        {token && (
                          <a
                            href={`/api/invitation/${encodeURIComponent(token)}/ics?lang=${lang}&eventId=${ev.id}${
                              pinInput ? `&pin=${encodeURIComponent(pinInput)}` : ''
                            }`}
                            download
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#762747] bg-white hover:bg-[#F6D6E2]/30 border border-[#EEDDE5] rounded-full transition-colors whitespace-nowrap"
                          >
                            <Calendar className="w-3.5 h-3.5 text-[#A93665]" />
                            <span>{t.invitation.exportCalendarSingle}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* PERSONALIZED DRESS CODE SECTION */}
        <section id="tenue" className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white border border-[#EEDDE5] rounded-3xl p-8 sm:p-12">
            <p className="text-xs font-medium text-[#A93665] tracking-wider">
              {t.publicPage.themeBadge}
            </p>
            <h2 className="font-serif-title text-3xl sm:text-4xl font-semibold text-[#30232B] mt-1">
              {t.invitation.dressCodeTitle}
            </h2>
            <p className="text-sm text-[#796670] mt-1">
              {t.invitation.dressCodeSubtitle}
            </p>

            {/* Color Palette Swatches */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {[
                { hex: '#FFFFFF', name: lang === 'fr' ? 'Blanc pur' : 'Pure White' },
                { hex: '#FFF8FB', name: lang === 'fr' ? 'Blanc rosé' : 'Blush White' },
                { hex: '#F6D6E2', name: lang === 'fr' ? 'Rose poudré' : 'Powder Pink' },
                { hex: '#EBAFC5', name: lang === 'fr' ? 'Rose doux' : 'Soft Pink' },
                { hex: '#A93665', name: lang === 'fr' ? 'Rose soutenu' : 'Deep Rose Accent' },
              ].map((swatch) => (
                <div key={swatch.hex} className="flex items-center gap-2.5">
                  <span
                    className="w-7 h-7 rounded-full border border-[#EEDDE5] shadow-xs shrink-0"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <span className="text-xs text-[#30232B] font-medium">{swatch.name}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#796670] mt-3">
              {t.invitation.pinkWhiteThemeNote}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {invitation.authorizedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-5 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5]"
                >
                  <p className="font-serif-title text-xl font-semibold text-[#762747]">
                    {lang === 'fr' ? ev.titleFr : ev.titleEn}
                  </p>
                  <p className="text-sm text-[#30232B] mt-1">
                    {lang === 'fr' ? ev.dressCodeFr : ev.dressCodeEn}
                  </p>
                </div>
              ))}
            </div>

            {hasEveningAccess && (
              <div className="mt-6 pt-6 border-t border-[#EEDDE5] flex items-center gap-3 text-xs sm:text-sm text-[#762747]">
                <Heart className="w-4 h-4 text-[#A93665] shrink-0" />
                <span>
                  {lang === 'fr'
                    ? 'Pour la grande soirée dès 20 h : tenue de soirée exigée pour les femmes comme pour les hommes, dans le respect du thème Rose & Blanc.'
                    : 'For the grand soirée starting at 8:00 PM: formal evening attire required for both women and men, honoring the Pink & White theme.'}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* PERSONALIZED RSVP FORM */}
        <section id="rsvp" className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white border border-[#EEDDE5] rounded-3xl p-8 sm:p-12 shadow-[0_12px_40px_rgb(118,39,71,0.05)]">
            <h2 className="font-serif-title text-3xl sm:text-4xl font-semibold text-[#30232B]">
              {t.rsvp.title}
            </h2>
            <p className="text-sm text-[#796670] mt-1">
              {t.rsvp.subtitle}
            </p>

            {invitation.respondedAt && (
              <div className="mt-4 p-4 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] flex items-center gap-3 text-xs sm:text-sm text-[#762747]">
                <CheckCircle2 className="w-5 h-5 text-[#A93665] shrink-0" />
                <span>
                  {t.rsvp.lastUpdated.replace('{date}', formatDate(invitation.respondedAt))}
                </span>
              </div>
            )}

            {isDeadlinePassed ? (
              <div className="mt-6 p-6 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm text-[#762747]">
                {t.rsvp.deadlinePassed}
              </div>
            ) : (
              <form onSubmit={handleRsvpSubmit} className="mt-8 space-y-8">
                {/* Per-person & Per-Authorized-Event participation */}
                <div className="space-y-6">
                  {peopleState.map((person, pIdx) => (
                    <div
                      key={person.id}
                      className="p-6 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] space-y-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <label
                            htmlFor={`person-name-${person.id}`}
                            className="block text-xs font-medium text-[#796670] mb-1"
                          >
                            {t.rsvp.personNameLabel} #{pIdx + 1}{' '}
                            {person.isPlusOne
                              ? `(${t.rsvp.plusOneBadge})`
                              : person.isChild
                              ? `(${t.rsvp.childBadge})`
                              : `(${t.rsvp.adultBadge})`}
                          </label>
                          <input
                            id={`person-name-${person.id}`}
                            type="text"
                            value={person.fullName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPeopleState((prev) =>
                                prev.map((item) =>
                                  item.id === person.id ? { ...item, fullName: val } : item
                                )
                              );
                            }}
                            placeholder={
                              person.isPlusOne ? t.rsvp.plusOnePlaceholder : person.fullName
                            }
                            required
                            className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#EEDDE5] text-sm text-[#30232B] focus:outline-none focus:border-[#A93665]"
                          />
                        </div>
                      </div>

                      {/* Event attendance buttons for this person (only if personIndex < event.allowedSeats) */}
                      <div className="space-y-3 pt-2 border-t border-[#EEDDE5]">
                        {invitation.authorizedEvents.map((ev) => {
                          if (pIdx >= ev.allowedSeats) {
                            return null;
                          }
                          const key = `${person.id}:${ev.id}`;
                          const currentChoice = attendanceMap[key] || 'yes';
                          const evTitle = lang === 'fr' ? ev.titleFr : ev.titleEn;
                          const evTime = lang === 'fr' ? ev.timeLabelFr : ev.timeLabelEn;

                          return (
                            <div
                              key={ev.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-[#30232B]">{evTitle}</p>
                                <p className="text-xs text-[#796670]">{evTime}</p>
                              </div>

                              <div
                                role="group"
                                aria-label={evTitle}
                                className="flex flex-wrap items-center gap-2"
                              >
                                {(
                                  [
                                    { val: 'yes', label: t.rsvp.yes },
                                    { val: 'no', label: t.rsvp.no },
                                    ...(invitation.allowMaybeOption
                                      ? [{ val: 'maybe', label: t.rsvp.maybe }]
                                      : []),
                                  ] as { val: AttendanceChoice; label: string }[]
                                ).map((opt) => (
                                  <button
                                    key={opt.val}
                                    type="button"
                                    onClick={() =>
                                      setAttendanceMap((prev) => ({
                                        ...prev,
                                        [key]: opt.val,
                                      }))
                                    }
                                    className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                                      currentChoice === opt.val
                                        ? 'bg-[#A93665] text-white'
                                        : 'bg-white text-[#796670] border border-[#EEDDE5] hover:text-[#30232B]'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional Dietary, Access & Message Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="rsvp-dietary"
                      className="block text-xs font-medium text-[#30232B] mb-2"
                    >
                      {t.rsvp.dietaryLabel}
                    </label>
                    <input
                      id="rsvp-dietary"
                      type="text"
                      value={dietaryNotes}
                      onChange={(e) => setDietaryNotes(e.target.value)}
                      placeholder={t.rsvp.dietaryPlaceholder}
                      className="w-full px-4 py-3 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm text-[#30232B] focus:outline-none focus:border-[#A93665]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="rsvp-access"
                      className="block text-xs font-medium text-[#30232B] mb-2"
                    >
                      {t.rsvp.accessNeedsLabel}
                    </label>
                    <input
                      id="rsvp-access"
                      type="text"
                      value={accessNeedNotes}
                      onChange={(e) => setAccessNeedNotes(e.target.value)}
                      placeholder={t.rsvp.accessNeedsPlaceholder}
                      className="w-full px-4 py-3 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm text-[#30232B] focus:outline-none focus:border-[#A93665]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rsvp-message"
                    className="block text-xs font-medium text-[#30232B] mb-2"
                  >
                    {t.rsvp.messageToCoupleLabel}
                  </label>
                  <textarea
                    id="rsvp-message"
                    rows={3}
                    value={messageToCouple}
                    onChange={(e) => setMessageToCouple(e.target.value)}
                    placeholder={t.rsvp.messageToCouplePlaceholder}
                    className="w-full px-4 py-3 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm text-[#30232B] focus:outline-none focus:border-[#A93665]"
                  />
                </div>

                {rsvpError && (
                  <div
                    role="alert"
                    className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2.5"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{rsvpError}</span>
                  </div>
                )}

                {rsvpSavedMessage && (
                  <div
                    role="status"
                    className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2.5"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" />
                    <span className="font-medium">{rsvpSavedMessage}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={rsvpSaving}
                    className="px-8 py-3.5 rounded-full bg-[#A93665] hover:bg-[#762747] disabled:opacity-60 text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    {rsvpSaving ? t.rsvp.submitting : t.rsvp.submitButton}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* MEMORIES GALLERY & GUESTBOOK WISHES */}
        <section id="souvenirs" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="bg-white border border-[#EEDDE5] rounded-3xl p-5 sm:p-10 md:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif-title text-2xl sm:text-4xl font-semibold text-[#30232B]">
                  {t.memories.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#796670] mt-1 leading-relaxed">
                  {t.memories.subtitle}
                </p>
              </div>

              {/* Interactive Segmented Control */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1.5 bg-[#FFF8FB] border border-[#EEDDE5] rounded-2xl sm:rounded-full self-start w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveMemoryTab('album')}
                  className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 text-xs font-medium rounded-xl sm:rounded-full transition-colors cursor-pointer whitespace-nowrap text-center ${
                    activeMemoryTab === 'album'
                      ? 'bg-[#A93665] text-white'
                      : 'text-[#796670] hover:text-[#30232B]'
                  }`}
                >
                  {t.memories.tabAlbum}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMemoryTab('upload')}
                  className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 text-xs font-medium rounded-xl sm:rounded-full transition-colors cursor-pointer whitespace-nowrap text-center ${
                    activeMemoryTab === 'upload'
                      ? 'bg-[#A93665] text-white'
                      : 'text-[#796670] hover:text-[#30232B]'
                  }`}
                >
                  {t.memories.tabUpload}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMemoryTab('wishes')}
                  className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 text-xs font-medium rounded-xl sm:rounded-full transition-colors cursor-pointer whitespace-nowrap text-center ${
                    activeMemoryTab === 'wishes'
                      ? 'bg-[#A93665] text-white'
                      : 'text-[#796670] hover:text-[#30232B]'
                  }`}
                >
                  {t.memories.tabWishes}
                </button>
              </div>
            </div>

            {/* TAB 1: PRIVATE GUEST & OFFICIAL ALBUM */}
            {activeMemoryTab === 'album' && (
              <div className="mt-8 space-y-4">
                <div className="p-4 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5] flex items-center gap-3 text-xs text-[#762747]">
                  <Lock className="w-4 h-4 text-[#A93665] shrink-0" />
                  <span>
                    {lang === 'fr'
                      ? 'Confidentialité garantie : les photos que vous importez sont visibles uniquement par les propriétaires de la plateforme (Joseph & Marie) et par vous-même.'
                      : 'Guaranteed privacy: photos you upload are visible solely to the platform owners (Joseph & Marie) and to you.'}
                  </span>
                </div>
                {photos.length === 0 ? (
                  <p className="text-sm text-[#796670] py-8 text-center">
                    {t.memories.emptyAlbum}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => setLightboxPhoto(photo)}
                        className="group cursor-pointer rounded-2xl overflow-hidden border border-[#EEDDE5] bg-[#FFF8FB] flex flex-col"
                      >
                        <div className="aspect-4/3 overflow-hidden bg-[#F6D6E2]/20 relative">
                          <img
                            src={photo.dataUrl}
                            alt={photo.caption || photo.contributorName}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-xs text-[10px] font-medium text-white">
                            {photo.invitationId === invitation.invitationId
                              ? lang === 'fr'
                                ? 'Votre publication (Privé)'
                                : 'Your upload (Private)'
                              : lang === 'fr'
                              ? 'Officiel Mariés'
                              : 'Official Couple'}
                          </span>
                        </div>
                        <div className="p-4">
                          {photo.caption && (
                            <p className="text-xs sm:text-sm text-[#30232B] line-clamp-2">
                              {photo.caption}
                            </p>
                          )}
                          <p className="text-xs text-[#796670] mt-1">
                            {photo.contributorName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: UPLOAD PHOTOS */}
            {activeMemoryTab === 'upload' && (
              <form onSubmit={handleUploadSubmit} className="mt-8 space-y-5 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="upload-name"
                      className="block text-xs font-medium text-[#30232B] mb-1.5"
                    >
                      {t.memories.uploadNameLabel}
                    </label>
                    <input
                      id="upload-name"
                      type="text"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="upload-scope"
                      className="block text-xs font-medium text-[#30232B] mb-1.5"
                    >
                      {t.memories.uploadScopeLabel}
                    </label>
                    <select
                      id="upload-scope"
                      value={uploadEventId}
                      onChange={(e) => setUploadEventId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                    >
                      <option value="">{t.memories.uploadScopeCommon}</option>
                      {invitation.authorizedEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {lang === 'fr' ? ev.titleFr : ev.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="upload-files"
                    className="block text-xs font-medium text-[#30232B] mb-1.5"
                  >
                    Photos (JPEG, PNG, WebP)
                  </label>
                  <label
                    htmlFor="upload-files"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#EBAFC5] rounded-2xl bg-[#FFF8FB] hover:bg-[#F6D6E2]/20 cursor-pointer transition-colors"
                  >
                    <Upload className="w-6 h-6 text-[#A93665]" />
                    <span className="text-xs font-medium text-[#30232B] mt-2">
                      {lang === 'fr'
                        ? 'Sélectionner des photos (jusqu’à 10 fichiers)'
                        : 'Select photos (up to 10 files)'}
                    </span>
                    <span className="text-[11px] text-[#796670] mt-1 text-center">
                      {t.memories.uploadLimitsInfo}
                    </span>
                    <input
                      id="upload-files"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handlePhotoFilesSelected}
                      className="sr-only"
                    />
                  </label>
                </div>

                {uploadPreviews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {uploadPreviews.map((src, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-xl overflow-hidden border border-[#EEDDE5]"
                      >
                        <img src={src} alt="Aperçu" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="upload-caption"
                    className="block text-xs font-medium text-[#30232B] mb-1.5"
                  >
                    {t.memories.uploadCaptionLabel}
                  </label>
                  <input
                    id="upload-caption"
                    type="text"
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8FB] border border-[#EEDDE5] text-sm"
                  />
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[#796670] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadConsent}
                    onChange={(e) => setUploadConsent(e.target.checked)}
                    required
                    className="mt-0.5 accent-[#A93665]"
                  />
                  <span>{t.memories.uploadConsentLabel}</span>
                </label>

                {uploadErrorMsg && (
                  <p className="text-xs text-red-700">{uploadErrorMsg}</p>
                )}
                {uploadStatusMsg && (
                  <p className="text-xs text-emerald-800 font-medium">{uploadStatusMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={uploadingPhotos || uploadPreviews.length === 0}
                  className="px-6 py-3 rounded-full bg-[#A93665] hover:bg-[#762747] disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  {t.memories.uploadButton}
                </button>
              </form>
            )}

            {/* TAB 3: GUESTBOOK WISHES */}
            {activeMemoryTab === 'wishes' && (
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-4">
                  {wishes.map((w) => (
                    <div
                      key={w.id}
                      className="p-5 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5]"
                    >
                      <p className="text-sm text-[#30232B] leading-relaxed">
                        « {w.message} »
                      </p>
                      <p className="text-xs font-medium text-[#762747] mt-2">
                        — {w.authorName}
                      </p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleWishSubmit} className="lg:col-span-5 space-y-4 p-6 rounded-2xl bg-[#FFF8FB] border border-[#EEDDE5]">
                  <div>
                    <label
                      htmlFor="wish-author"
                      className="block text-xs font-medium text-[#30232B] mb-1"
                    >
                      {t.memories.wishAuthorLabel}
                    </label>
                    <input
                      id="wish-author"
                      type="text"
                      value={wishAuthor}
                      onChange={(e) => setWishAuthor(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#EEDDE5] text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="wish-msg"
                      className="block text-xs font-medium text-[#30232B] mb-1"
                    >
                      {t.memories.wishMessageLabel}
                    </label>
                    <textarea
                      id="wish-msg"
                      rows={3}
                      value={wishMessage}
                      onChange={(e) => setWishMessage(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#EEDDE5] text-sm"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-xs text-[#796670] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wishPublic}
                      onChange={(e) => setWishPublic(e.target.checked)}
                      className="mt-0.5 accent-[#A93665]"
                    />
                    <span>{t.memories.wishPublicLabel}</span>
                  </label>
                  {wishSuccessMsg && (
                    <p className="text-xs text-emerald-800 font-medium">{wishSuccessMsg}</p>
                  )}
                  <button
                    type="submit"
                    disabled={wishSending}
                    className="w-full py-2.5 px-5 rounded-full bg-[#A93665] hover:bg-[#762747] text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    {t.memories.wishSubmit}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="max-w-3xl w-full bg-white rounded-3xl overflow-hidden border border-[#EEDDE5]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={lightboxPhoto.dataUrl}
                alt={lightboxPhoto.caption}
                className="max-h-[75vh] w-auto object-contain"
              />
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#30232B]">{lightboxPhoto.caption}</p>
                <p className="text-xs text-[#796670] mt-0.5">{lightboxPhoto.contributorName}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
