import { createClient, SanityClient } from '@sanity/client';
import dotenv from 'dotenv';
import { DatabaseState } from './weddingStore.ts';

dotenv.config();

const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || 'rpzi1x95';
const SANITY_DATASET = process.env.SANITY_DATASET || 'production';
const SANITY_API_TOKEN = process.env.SANITY_API_TOKEN || '';

const STATE_DOC_ID = 'joseph-et-marie-wedding-state-2026';

let sanityClientInstance: SanityClient | null = null;

export function getSanityClient(): SanityClient | null {
  if (!SANITY_PROJECT_ID || !SANITY_API_TOKEN) {
    return null;
  }
  if (!sanityClientInstance) {
    sanityClientInstance = createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: '2025-02-01',
      token: SANITY_API_TOKEN,
      useCdn: false, // Always fetch fresh transactional data for invitations & RSVPs
    });
  }
  return sanityClientInstance;
}

/**
 * Loads the wedding database state from Sanity.io (`rpzi1x95`),
 * or seeds Sanity with the initial state if the document does not exist yet.
 */
export async function syncStateFromSanity(fallbackState: DatabaseState): Promise<DatabaseState> {
  const client = getSanityClient();
  if (!client) {
    return fallbackState;
  }

  try {
    const existingDoc = await client.getDocument(STATE_DOC_ID);
    if (existingDoc && existingDoc.payloadJson) {
      const parsed = JSON.parse(existingDoc.payloadJson as string) as DatabaseState;
      if (parsed && Array.isArray(parsed.events) && Array.isArray(parsed.invitations)) {
        return parsed;
      }
    }

    // Seed Sanity if no state document exists yet
    await saveStateToSanity(fallbackState);
    return fallbackState;
  } catch (err) {
    console.error('Sanity initial sync warning (using local state & retrying on next write):', err);
    return fallbackState;
  }
}

/**
 * Persists the complete wedding state + individual structured documents to Sanity.io (`rpzi1x95`).
 */
export async function saveStateToSanity(state: DatabaseState): Promise<boolean> {
  const client = getSanityClient();
  if (!client) {
    return false;
  }

  try {
    await client.createOrReplace({
      _id: STATE_DOC_ID,
      _type: 'weddingPlatformState',
      couple: 'Joseph & Marie',
      weddingDate: '2026-12-01',
      organizationId: process.env.SANITY_ORG_ID || 'oh314dkvd',
      invitationsCount: state.invitations.length,
      photosCount: state.photos.length,
      wishesCount: state.wishes.length,
      updatedAt: new Date().toISOString(),
      payloadJson: JSON.stringify(state),
    });
    return true;
  } catch (err) {
    console.error('Failed to persist state to Sanity:', err);
    return false;
  }
}
