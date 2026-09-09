/**
 * Admin script to set Firebase Auth custom claims for tenant access.
 * 
 * Usage:
 *   npx ts-node scripts/set-custom-claims.ts <user-email> <tenant-id> [--admin] [--super-admin]
 * 
 * Examples:
 *   # Grant user access to a tenant:
 *   npx ts-node scripts/set-custom-claims.ts user@example.com tenant-repair-01
 * 
 *   # Grant admin access to a tenant:
 *   npx ts-node scripts/set-custom-claims.ts user@example.com tenant-repair-01 --admin
 * 
 *   # Make a super admin (access to all tenants):
 *   npx ts-node scripts/set-custom-claims.ts user@example.com tenant-repair-01 --super-admin
 * 
 * Note: This script requires GOOGLE_APPLICATION_CREDENTIALS env variable to be set,
 *       or must be run from an environment with Firebase Admin SDK default credentials.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'aivoice-inventory-mangement',
  });
}

async function setCustomClaims() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npx ts-node scripts/set-custom-claims.ts <email> <tenant-id> [--admin] [--super-admin]');
    console.error('');
    console.error('Examples:');
    console.error('  npx ts-node scripts/set-custom-claims.ts john@example.com tenant-repair-01');
    console.error('  npx ts-node scripts/set-custom-claims.ts john@example.com tenant-repair-01 --admin');
    console.error('  npx ts-node scripts/set-custom-claims.ts john@example.com tenant-repair-01 --super-admin');
    process.exit(1);
  }

  const email = args[0];
  const tenantId = args[1];
  const isAdmin = args.includes('--admin');
  const isSuperAdmin = args.includes('--super-admin');

  try {
    // Look up the user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.uid} (${user.email})`);

    // Get existing claims (to preserve them)
    const existingClaims = user.customClaims || {};
    const existingTenants: string[] = existingClaims.tenants || [];

    // Add the new tenant to the list (if not already present)
    const tenants = Array.from(new Set([...existingTenants, tenantId]));

    // Build new claims
    const newClaims: Record<string, any> = {
      ...existingClaims,
      tenants,
    };

    if (isAdmin || isSuperAdmin) {
      newClaims.role = 'admin';
    }

    if (isSuperAdmin) {
      newClaims.super_admin = true;
    }

    // Set the custom claims
    await admin.auth().setCustomUserClaims(user.uid, newClaims);

    console.log('');
    console.log('✅ Custom claims set successfully!');
    console.log('');
    console.log('Claims:', JSON.stringify(newClaims, null, 2));
    console.log('');
    console.log('⚠️  The user must sign out and sign back in for the new claims to take effect.');
    console.log('   (Or wait up to 1 hour for the token to refresh automatically.)');

  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ No user found with email: ${email}`);
      console.error('   The user must sign in at least once before you can set custom claims.');
    } else {
      console.error('❌ Error setting custom claims:', error.message);
    }
    process.exit(1);
  }
}

setCustomClaims();
