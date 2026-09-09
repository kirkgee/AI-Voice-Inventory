import { getDb } from '../firebaseAdmin';
import { DalResult, handleDalError, sanitizeDoc as sanitizeDocument } from './utils';

export interface User {
  id: string;
  tenantId: string;
  email?: string;
  [key: string]: any;
}


/**
 * Get all users
 */
export async function getAll(tenantId: string): Promise<DalResult<User[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('users').where('tenantId', '==', tenantId).get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as User) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get single user
 */
export async function getById(tenantId: string, id: string): Promise<DalResult<User | null>> {
  try {
  const db = getDb();
  const doc = await db.collection('users').doc(id).get();
  if (!doc.exists) return { success: true, data: null };
  const data = sanitizeDocument(doc) as User;
  if (data.tenantId !== tenantId) return { success: true, data: null };
  return { success: true, data: data };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Find user by email
 */
export async function getByEmail(tenantId: string, email: string): Promise<DalResult<User | null>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('users')
    .where('tenantId', '==', tenantId)
    .where('email', '==', email)
    .get();
  if (snapshot.empty) return { success: true, data: null };
  return { success: true, data: sanitizeDocument(snapshot.docs[0]) as User };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Create user
 */
export async function create(tenantId: string, data: Partial<User>): Promise<DalResult<User>> {
  try {
  const db = getDb();
  const docRef = db.collection('users').doc();
  const payload = { ...data, tenantId, createdAt: new Date() };
  await docRef.set(payload);
  return { success: true, data: { id: docRef.id, ...payload } as User };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Update user
 */
export async function update(tenantId: string, id: string, data: Partial<User>): Promise<DalResult<User>> {
  try {
  const db = getDb();
  const docRef = db.collection('users').doc(id);
  await docRef.update({ ...data, updatedAt: new Date() });
  const updated = await docRef.get();
  return { success: true, data: sanitizeDocument(updated) as User };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Delete user
 */
async function deleteUser(tenantId: string, id: string): Promise<DalResult<void>> {
  try {
  const db = getDb();
  await db.collection('users').doc(id).delete();

    return { success: true, data: undefined as any };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
export { deleteUser as delete };
