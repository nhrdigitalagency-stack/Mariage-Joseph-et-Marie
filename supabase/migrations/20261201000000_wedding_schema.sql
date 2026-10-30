-- =============================================================================
-- JOSEPH & MARIE — MARIAGE 1er DÉCEMBRE 2026 (YAOUNDÉ)
-- SUPABASE / POSTGRESQL COMPLETE SCHEMA, RLS POLICIES & SERVER FUNCTIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLE: weddings
CREATE TABLE IF NOT EXISTS public.weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL DEFAULT 'joseph-et-marie-2026',
  couple_names TEXT NOT NULL DEFAULT 'Joseph & Marie',
  wedding_date DATE NOT NULL DEFAULT '2026-12-01',
  theme_fr TEXT NOT NULL DEFAULT 'Rose & Blanc',
  theme_en TEXT NOT NULL DEFAULT 'Pink & White',
  timezone TEXT NOT NULL DEFAULT 'Africa/Douala',
  gallery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLE: wedding_events
CREATE TABLE IF NOT EXISTS public.wedding_events (
  id TEXT PRIMARY KEY CHECK (id IN ('civil', 'church', 'home_reception', 'cocktail', 'evening')),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  title_fr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  event_date DATE NOT NULL DEFAULT '2026-12-01',
  start_time TEXT, -- e.g. '11:30', '14:30', '20:00' or NULL when not fixed
  time_label_fr TEXT NOT NULL,
  time_label_en TEXT NOT NULL,
  end_label_fr TEXT,
  end_label_en TEXT,
  venue_name_fr TEXT NOT NULL,
  venue_name_en TEXT NOT NULL,
  address_fr TEXT NOT NULL,
  address_en TEXT NOT NULL,
  is_address_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  is_private_address BOOLEAN NOT NULL DEFAULT FALSE,
  map_url TEXT,
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  dress_code_fr TEXT NOT NULL,
  dress_code_en TEXT NOT NULL,
  notes_fr JSONB DEFAULT '[]'::jsonb,
  notes_en JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLE: invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL, -- SHA-256 hex digest of the cryptographic token
  token_preview TEXT NOT NULL,     -- Masked preview or encrypted token for admin link copy
  display_name TEXT NOT NULL,
  primary_first_name TEXT NOT NULL,
  primary_last_name TEXT NOT NULL,
  secondary_person_name TEXT,
  custom_greeting_fr TEXT,
  custom_greeting_en TEXT,
  personal_note_fr TEXT,
  personal_note_en TEXT,
  phone TEXT,
  email TEXT,
  internal_note TEXT,              -- NEVER exposed to guest API
  invitation_type TEXT NOT NULL CHECK (invitation_type IN ('individual', 'couple', 'plus_one', 'family')),
  max_adults INT NOT NULL DEFAULT 1 CHECK (max_adults >= 1),
  max_children INT NOT NULL DEFAULT 0 CHECK (max_children >= 0),
  max_total INT NOT NULL DEFAULT 1 CHECK (max_total >= 1 AND max_total >= max_adults),
  capacity_mode TEXT NOT NULL DEFAULT 'simple' CHECK (capacity_mode IN ('simple', 'advanced')),
  preferred_lang TEXT NOT NULL DEFAULT 'fr' CHECK (preferred_lang IN ('fr', 'en')),
  rsvp_deadline TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  access_pin_hash TEXT,            -- Optional secondary code hash
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'revoked')),
  whatsapp_status TEXT NOT NULL DEFAULT 'not_prepared' CHECK (whatsapp_status IN ('not_prepared', 'prepared', 'declared_sent')),
  rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'accepted', 'declined', 'partial')),
  dietary_notes TEXT,
  access_need_notes TEXT,
  message_to_couple TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLE: invitation_event_access
CREATE TABLE IF NOT EXISTS public.invitation_event_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES public.wedding_events(id) ON DELETE CASCADE,
  allowed_seats INT NOT NULL CHECK (allowed_seats >= 1),
  UNIQUE (invitation_id, event_id)
);

-- 5. TABLE: invitation_people
CREATE TABLE IF NOT EXISTS public.invitation_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  person_index INT NOT NULL CHECK (person_index >= 0),
  full_name TEXT NOT NULL,
  is_child BOOLEAN NOT NULL DEFAULT FALSE,
  is_plus_one BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (invitation_id, person_index)
);

-- 6. TABLE: rsvp_responses
CREATE TABLE IF NOT EXISTS public.rsvp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.invitation_people(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES public.wedding_events(id) ON DELETE CASCADE,
  attendance TEXT NOT NULL CHECK (attendance IN ('yes', 'no', 'maybe')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invitation_id, person_id, event_id)
);

-- 7. TABLE: guest_messages
CREATE TABLE IF NOT EXISTS public.guest_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_public_wish BOOLEAN NOT NULL DEFAULT TRUE,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TABLE: photos
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES public.wedding_events(id) ON DELETE SET NULL, -- NULL = common album
  contributor_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  visibility_scope TEXT NOT NULL DEFAULT 'common' CHECK (visibility_scope IN ('common', 'event')),
  consent_given BOOLEAN NOT NULL DEFAULT TRUE,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TABLE: admin_roles
CREATE TABLE IF NOT EXISTS public.admin_roles (
  user_id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'invitation_manager', 'memory_moderator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TABLE: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) — ZERO DIRECT GUEST ACCESS TO INVITATIONS
-- =============================================================================

ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin helper function
CREATE OR REPLACE FUNCTION public.is_wedding_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()
  );
$$;

-- Only authenticated admins can query raw tables directly.
-- Guests NEVER query invitations/wedding_events directly; they go through SECURITY DEFINER RPCs.
CREATE POLICY "Admins full access weddings" ON public.weddings FOR ALL USING (public.is_wedding_admin());
CREATE POLICY "Admins full access events" ON public.wedding_events FOR ALL USING (public.is_wedding_admin());
CREATE POLICY "Admins full access invitations" ON public.invitations FOR ALL USING (public.is_wedding_admin());
CREATE POLICY "Admins full access event_access" ON public.invitation_event_access FOR ALL USING (public.is_wedding_admin());
CREATE POLICY "Admins full access people" ON public.invitation_people FOR ALL USING (public.is_wedding_admin());
CREATE POLICY "Admins full access rsvp" ON public.rsvp_responses FOR ALL USING (public.is_wedding_admin());
CREATE POLICY "Admins full access messages" ON public.guest_messages FOR ALL USING (public.is_wedding_admin());
CREATE POLICY "Admins full access photos" ON public.photos FOR ALL USING (public.is_wedding_admin());
CREATE POLICY "Admins full access roles" ON public.admin_roles FOR ALL USING (public.is_wedding_admin());
CREATE POLICY "Admins full access logs" ON public.audit_logs FOR ALL USING (public.is_wedding_admin());

-- =============================================================================
-- SECURE SERVER FUNCTION: RESOLVE INVITATION BY TOKEN
-- Filters out unauthorized events and internal fields at the database boundary
-- =============================================================================
CREATE OR REPLACE FUNCTION public.resolve_guest_invitation(p_raw_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_inv RECORD;
  v_events JSONB;
  v_people JSONB;
  v_responses JSONB;
BEGIN
  v_hash := encode(digest(p_raw_token, 'sha256'), 'hex');

  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token_hash = v_hash
  LIMIT 1;

  IF NOT FOUND OR v_inv.status <> 'active' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_or_unavailable');
  END IF;

  IF v_inv.expires_at IS NOT NULL AND v_inv.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_or_unavailable');
  END IF;

  -- Load ONLY authorized events for this invitation
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'sortOrder', e.sort_order,
      'titleFr', e.title_fr,
      'titleEn', e.title_en,
      'eventDate', e.event_date,
      'startTime', e.start_time,
      'timeLabelFr', e.time_label_fr,
      'timeLabelEn', e.time_label_en,
      'endLabelFr', e.end_label_fr,
      'endLabelEn', e.end_label_en,
      'venueNameFr', e.venue_name_fr,
      'venueNameEn', e.venue_name_en,
      'addressFr', e.address_fr,
      'addressEn', e.address_en,
      'isAddressConfirmed', e.is_address_confirmed,
      'mapUrl', CASE WHEN e.is_address_confirmed THEN e.map_url ELSE NULL END,
      'descriptionFr', e.description_fr,
      'descriptionEn', e.description_en,
      'dressCodeFr', e.dress_code_fr,
      'dressCodeEn', e.dress_code_en,
      'notesFr', e.notes_fr,
      'notesEn', e.notes_en,
      'allowedSeats', a.allowed_seats
    ) ORDER BY e.sort_order ASC
  ), '[]'::jsonb)
  INTO v_events
  FROM public.invitation_event_access a
  JOIN public.wedding_events e ON e.id = a.event_id
  WHERE a.invitation_id = v_inv.id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'personIndex', p.person_index,
      'fullName', p.full_name,
      'isChild', p.is_child,
      'isPlusOne', p.is_plus_one
    ) ORDER BY p.person_index ASC
  ), '[]'::jsonb)
  INTO v_people
  FROM public.invitation_people p
  WHERE p.invitation_id = v_inv.id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'personId', r.person_id,
      'eventId', r.event_id,
      'attendance', r.attendance
    )
  ), '[]'::jsonb)
  INTO v_responses
  FROM public.rsvp_responses r
  JOIN public.invitation_event_access a ON a.invitation_id = r.invitation_id AND a.event_id = r.event_id
  WHERE r.invitation_id = v_inv.id;

  RETURN jsonb_build_object(
    'valid', true,
    'invitation', jsonb_build_object(
      'displayName', v_inv.display_name,
      'invitationType', v_inv.invitation_type,
      'customGreetingFr', v_inv.custom_greeting_fr,
      'customGreetingEn', v_inv.custom_greeting_en,
      'personalNoteFr', v_inv.personal_note_fr,
      'personalNoteEn', v_inv.personal_note_en,
      'maxAdults', v_inv.max_adults,
      'maxChildren', v_inv.max_children,
      'maxTotal', v_inv.max_total,
      'capacityMode', v_inv.capacity_mode,
      'preferredLang', v_inv.preferred_lang,
      'rsvpDeadline', v_inv.rsvp_deadline,
      'rsvpStatus', v_inv.rsvp_status,
      'dietaryNotes', v_inv.dietary_notes,
      'accessNeedNotes', v_inv.access_need_notes,
      'messageToCouple', v_inv.message_to_couple,
      'respondedAt', v_inv.responded_at
    ),
    'authorizedEvents', v_events,
    'people', v_people,
    'responses', v_responses
  );
END;
$$;
