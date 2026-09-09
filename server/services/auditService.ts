import { getDb } from '../firebaseAdmin';

/**
 * Logs an audit action to the Firestore 'auditLogs' collection.
 * 
 * @param tenantId - The tenant ID
 * @param user - Information about the user performing the action
 * @param action - The action performed
 * @param entityType - The type of entity being acted upon
 * @param entityId - The ID of the entity
 */
export async function logAuditAction(
  tenantId: string,
  user: { email: string; id?: string },
  action: string,
  entityType: string,
  entityId: string
): Promise<void> {
  const db = getDb();
  
  try {
    await db.collection('auditLogs').add({
      tenantId,
      userEmail: user.email,
      userId: user.id || null,
      action,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}

/**
 * Extracts user information from request headers.
 * Looks for 'x-user-email' header or decodes from auth token.
 * 
 * @param req - The incoming HTTP request or NextApiRequest
 * @returns User object containing email
 */
export function extractUserFromHeaders(req: any): { email: string } {
  const headers = req?.headers;
  
  if (headers instanceof Headers) {
    const email = headers.get('x-user-email');
    if (email) return { email };
  } else if (headers && typeof headers === 'object') {
    const email = headers['x-user-email'];
    if (email && typeof email === 'string') return { email };
  }
  
  return { email: 'system' };
}
