import { db } from '@/lib/firebaseClient';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { JobModelConfig } from '@/types/jobModels';
import { getDefaultJobModelPresets } from '@/lib/presets/defaultJobModels';

const COLLECTION_NAME = 'jobConfigurations';

function mapDocToConfig(docId: string, data: DocumentData): JobModelConfig {
  return {
    id: docId,
    ...data,
  } as JobModelConfig;
}

/**
 * Gets all job model configurations for a tenant.
 */
export async function getAll(tenantId: string): Promise<JobModelConfig[]> {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  const snapshot = await getDocs(q);
  const configs = snapshot.docs.map(d => mapDocToConfig(d.id, d.data()));

  // If none exist for this tenant, automatically seed presets to provide instant out-of-the-box value
  if (configs.length === 0) {
    return await seedDefaultPresets(tenantId);
  }

  return configs;
}

/**
 * Subscribes to all job model configurations for a tenant in real-time.
 */
export function subscribeAll(
  tenantId: string,
  callback: (configs: JobModelConfig[], metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    async (snapshot: QuerySnapshot<DocumentData>) => {
      if (snapshot.empty && !snapshot.metadata.hasPendingWrites) {
        // Automatically seed default presets if empty
        const seeded = await seedDefaultPresets(tenantId);
        callback(seeded, { fromCache: false, hasPendingWrites: false });
        return;
      }
      const configs = snapshot.docs.map(d => mapDocToConfig(d.id, d.data()));
      callback(configs, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    }
  );
}

/**
 * Gets a single job model configuration by ID.
 */
export async function getById(tenantId: string, id: string): Promise<JobModelConfig | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.tenantId !== tenantId) return null;
  return mapDocToConfig(snapshot.id, data);
}

/**
 * Creates a new job model configuration.
 */
export async function create(
  tenantId: string,
  data: Omit<JobModelConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing job model configuration.
 */
export async function update(
  tenantId: string,
  id: string,
  data: Partial<JobModelConfig>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a job model configuration.
 */
export async function deleteConfig(tenantId: string, id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Seeds built-in industry job model presets for a tenant.
 */
export async function seedDefaultPresets(tenantId: string): Promise<JobModelConfig[]> {
  const presets = getDefaultJobModelPresets(tenantId);
  const results: JobModelConfig[] = [];

  for (const preset of presets) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...preset,
        tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      results.push({
        id: docRef.id,
        ...preset,
      });
    } catch (e) {
      console.warn('Could not seed preset to remote Firestore, using local preset copy', e);
      results.push({
        id: `preset-${preset.code.toLowerCase()}`,
        ...preset,
      });
    }
  }

  return results;
}
