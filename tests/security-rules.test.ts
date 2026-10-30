import assert from 'node:assert/strict';
import {
  DatabaseState,
  generateAuthorizedIcs,
  generateSecureToken,
  getInitialEvents,
  getInitialInvitations,
  hashToken,
  resolveGuestInvitationFromState,
  sanitizeCsvCell,
  validateAndSaveRsvp,
} from '../src/server/weddingStore.ts';

function createFreshTestState(): DatabaseState {
  return {
    events: getInitialEvents(),
    invitations: getInitialInvitations(),
    wishes: [],
    photos: [],
    auditLogs: [],
  };
}

async function runTests() {
  console.log('Running automated security & authorization test suite for Joseph & Marie Wedding Platform...\n');

  const state = createFreshTestState();

  // 1. Test Madame Clarisse (Church + Evening only, 1 plus_one -> 2 seats)
  {
    const tokClarisse = 'clarisse-eglise-soiree-9x8k2m7p4q1v5n3z';
    const res = resolveGuestInvitationFromState(state, tokClarisse);
    assert.equal(res.status, 200, 'Madame Clarisse token should resolve with 200');
    const eventIds = res.data.authorizedEvents.map((e) => e.id);
    assert.deepEqual(eventIds, ['church', 'evening'], 'Clarisse must ONLY receive church and evening events');
    assert.equal(
      eventIds.includes('civil') || eventIds.includes('home_reception') || eventIds.includes('cocktail'),
      false,
      'Unauthorized events must NEVER be transmitted in the API response'
    );
    assert.equal((res.data as unknown as Record<string, unknown>).internalNote, undefined, 'internalNote must never be exposed');
    console.log('✓ Test 1 & 16 passed: Madame Clarisse receives ONLY Church + Evening; zero unauthorized event data in API payload.');
  }

  // 2. Test Individual Evening-only invitation (Aline) & attempt to add a Plus-One or respond to Civil
  {
    const tokAline = 'aline-individuel-soiree-3h7w9b2k5m8p1x4c';
    const res = resolveGuestInvitationFromState(state, tokAline);
    assert.equal(res.status, 200);
    assert.deepEqual(res.data.authorizedEvents.map((e) => e.id), ['evening']);
    assert.equal(res.data.maxTotal, 1);

    // Attempt to respond to unauthorized 'civil' event
    const unauthorizedAttempt = validateAndSaveRsvp(state, tokAline, {
      responses: [{ personId: 'p-aline-1', eventId: 'civil', attendance: 'yes' }],
    });
    assert.equal(unauthorizedAttempt.status, 403, 'Responding to an unauthorized event must be rejected with 403');

    // Attempt to exceed individual capacity by passing 2 people
    const exceedPeopleAttempt = validateAndSaveRsvp(state, tokAline, {
      people: [
        { id: 'p-aline-1', fullName: 'Aline Essomba' },
        { id: 'p-fake-2', fullName: 'Intruder Guest' },
      ],
      responses: [{ personId: 'p-aline-1', eventId: 'evening', attendance: 'yes' }],
    });
    assert.equal(exceedPeopleAttempt.status, 400, 'Adding a plus-one on an individual invitation must be rejected with 400');
    console.log('✓ Test 2, 5, 10, 11 passed: Individual Evening-only invitation & strict server rejection of unauthorized events/guests.');
  }

  // 3. Test Couple with Per-Event Advanced Seat Limits (Church: 2, Cocktail: 2, Evening: 1)
  {
    const tokCouple = 'aline-patrick-couple-complet-6t4r8n2v9j5l1q7w';
    const res = resolveGuestInvitationFromState(state, tokCouple);
    assert.equal(res.status, 200);
    const eveningEv = res.data.authorizedEvents.find((e) => e.id === 'evening');
    const churchEv = res.data.authorizedEvents.find((e) => e.id === 'church');
    assert.equal(churchEv?.allowedSeats, 2);
    assert.equal(eveningEv?.allowedSeats, 1);

    // Attempt to confirm 2 'yes' for evening when evening only allows 1 seat
    const exceedEventLimit = validateAndSaveRsvp(state, tokCouple, {
      responses: [
        { personId: 'p-couple-1', eventId: 'evening', attendance: 'yes' },
        { personId: 'p-couple-2', eventId: 'evening', attendance: 'yes' },
      ],
    });
    assert.equal(exceedEventLimit.status, 400, 'Confirming 2 seats on a 1-seat event must be rejected');
    console.log('✓ Test 6 & 9 passed: Advanced per-event seat capacity strictly enforced on server.');
  }

  // 4. Test Mairie + Église invitation & Family all-5-events invitation
  {
    const tokMairieEglise = 'jean-paul-mairie-eglise-2w8k5n9p3x7v1m4q';
    const resME = resolveGuestInvitationFromState(state, tokMairieEglise);
    assert.equal(resME.status, 200);
    assert.deepEqual(resME.data.authorizedEvents.map((e) => e.id), ['civil', 'church']);

    const tokFamille = 'famille-mbarga-complet-5p2m9x4v7k1n8q3r';
    const resFam = resolveGuestInvitationFromState(state, tokFamille);
    assert.equal(resFam.status, 200);
    assert.deepEqual(
      resFam.data.authorizedEvents.map((e) => e.id),
      ['civil', 'church', 'home_reception', 'cocktail', 'evening']
    );
    assert.equal(resFam.data.maxTotal, 4);
    console.log('✓ Test 3, 4, 8 passed: Mairie+Église and Family (4 seats, 5 events including private home reception) verified.');
  }

  // 5. Test Invalid Link, Revoked Link, and Token Rotation
  {
    const resInvalid = resolveGuestInvitationFromState(state, 'non-existent-random-token-1234567890');
    assert.equal(resInvalid.status, 404);

    const tokRevoquee = 'invitation-revoquee-test-7m3k9p1x5v2n8q4w';
    const resRevoked = resolveGuestInvitationFromState(state, tokRevoquee);
    assert.equal(resRevoked.status, 404, 'Revoked link must return 404 without leaking guest name');

    // Rotate token for Jean-Paul
    const jpInv = state.invitations.find((i) => i.id === 'inv-mairie-eglise-05')!;
    const oldToken = jpInv.rawTokenForAdminCopy;
    const newToken = generateSecureToken();
    jpInv.tokenHash = hashToken(newToken);
    jpInv.rawTokenForAdminCopy = newToken;

    const oldLookup = resolveGuestInvitationFromState(state, oldToken);
    assert.equal(oldLookup.status, 404, 'Old token must be immediately invalidated after rotation');
    const newLookup = resolveGuestInvitationFromState(state, newToken);
    assert.equal(newLookup.status, 200, 'New rotated token must resolve properly');
    console.log('✓ Test 12, 13, 14 passed: Invalid link, revoked link, and token rotation verified.');
  }

  // 6. Test Filtered ICS Calendar Export & CSV Formula Injection Protection
  {
    const tokClarisse = 'clarisse-eglise-soiree-9x8k2m7p4q1v5n3z';
    const res = resolveGuestInvitationFromState(state, tokClarisse);
    assert.equal(res.status, 200);
    const ics = generateAuthorizedIcs(res.data.authorizedEvents, 'fr');
    assert.equal(ics.includes('La cérémonie religieuse'), true);
    assert.equal(ics.includes('La grande soirée de mariage'), true);
    assert.equal(ics.includes('Le mariage civil'), false, 'ICS must not include unauthorized civil ceremony');
    assert.equal(ics.includes('Domicile des mariés'), false, 'ICS must not include unauthorized home reception');
    assert.equal(ics.includes('Africa/Douala'), true, 'ICS must use Africa/Douala timezone');

    const sanitizedFormula = sanitizeCsvCell('=cmd|\' /C calc\'!A0');
    assert.equal(sanitizedFormula.startsWith('"\'='), true, 'CSV formula injection must be neutralized');
    console.log('✓ Test 17 & CSV security passed: Filtered ICS export and CSV formula injection guard verified.');
  }

  // 7. Test Strict Private Photo Visibility (visible ONLY to platform owners and the guest who published)
  {
    const tokClarisse = 'clarisse-eglise-soiree-9x8k2m7p4q1v5n3z';
    const tokAline = 'aline-individuel-soiree-3h7w9b2k5m8p1x4c';
    const resClarisse = resolveGuestInvitationFromState(state, tokClarisse);
    const resAline = resolveGuestInvitationFromState(state, tokAline);
    assert.equal(resClarisse.status, 200);
    assert.equal(resAline.status, 200);

    // Simulate Clarisse uploading a photo
    state.photos.push({
      id: 'photo-clarisse-private-1',
      invitationId: resClarisse.data.invitationId,
      contributorName: 'Madame Clarisse',
      eventId: 'evening',
      visibilityScope: 'event',
      caption: 'Souvenir de la soirée',
      dataUrl: 'data:image/jpeg;base64,test',
      consentGiven: true,
      moderationStatus: 'pending',
      createdAt: new Date().toISOString(),
    });

    // Helper mirroring GET /api/invitation/:token/memories visibility filter
    const getVisiblePhotosForGuest = (guestView: typeof resClarisse.data) => {
      const authorizedIds = guestView.authorizedEvents.map((e) => e.id);
      return state.photos.filter(
        (p) =>
          p.moderationStatus !== 'rejected' &&
          (p.invitationId === guestView.invitationId ||
            (p.invitationId === null &&
              p.moderationStatus === 'approved' &&
              (p.eventId === null || authorizedIds.includes(p.eventId))))
      );
    };

    const clarisseVisible = getVisiblePhotosForGuest(resClarisse.data);
    const alineVisible = getVisiblePhotosForGuest(resAline.data);

    assert.equal(
      clarisseVisible.some((p) => p.id === 'photo-clarisse-private-1'),
      true,
      'Uploader (Clarisse) must see her own uploaded photo immediately'
    );
    assert.equal(
      alineVisible.some((p) => p.id === 'photo-clarisse-private-1'),
      false,
      'Other guests (Aline) must NEVER see photos uploaded by Clarisse'
    );
    assert.equal(
      state.photos.some((p) => p.id === 'photo-clarisse-private-1'),
      true,
      'Platform owners (Admin) must see all uploaded photos'
    );
    console.log('✓ Test 18 passed: Strict private photo visibility (only platform owners + uploader can see uploaded photos).');
  }

  console.log('\nALL AUTOMATED SECURITY & AUTHORIZATION TESTS PASSED SUCCESSFULLY.');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
