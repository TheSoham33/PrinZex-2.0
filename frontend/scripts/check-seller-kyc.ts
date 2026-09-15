/**
 * Guard for the seller KYC self-service UI (gap #7 — "Seller KYC upload UI
 * missing"): sellers must be able to view + upload/replace their verification
 * documents from Seller settings, reusing the existing onboarding document
 * lane and the admin verification queue.
 *
 *   · settings page exposes a "KYC documents" tab
 *   · the section reads GET /api/seller/register/status (the shared status lane)
 *   · uploads go to POST /api/seller/register/documents as multipart (FormData
 *     via apiRequest — NOT JSON-stringified), the same endpoint onboarding uses
 *   · the UI reflects the admin verification queue: per-document
 *     verified / under review / not uploaded states, and warns that replacing a
 *     verified document resets it to re-verification
 *
 * Run from the frontend root: npx tsx scripts/check-seller-kyc.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

// ── settings page hosts the section ────────────────────────────────────────
const settings = read('src/app/seller/dashboard/settings/page.tsx');
assert.ok(settings.includes("'KYC documents'"), 'settings tabs must include "KYC documents"');
assert.ok(settings.includes('<SellerKycSection />'), 'settings page must render the KYC section');

// ── API helpers reuse the onboarding document lane ─────────────────────────
const api = read('src/lib/api/seller-settings.ts');
assert.ok(
  api.includes("get('/seller/register/status')"),
  'KYC status must reuse GET /seller/register/status',
);
assert.ok(
  api.includes("apiRequest<{ documents: SellerKycDocument[] }>('/seller/register/documents'"),
  'KYC uploads must reuse POST /seller/register/documents',
);
assert.ok(api.includes("method: 'POST'"), 'KYC upload must POST');
assert.ok(api.includes('body: formData'), 'KYC upload must send multipart FormData (never JSON)');

// ── the API client lets a seller token drive the shared document lane ──────
// Approved sellers reach the settings page with ONLY a seller JWT; the client
// must fall back to it (the backend accepts both customer and seller tokens).
const client = read('src/lib/api/client.ts');
assert.ok(
  client.includes("endpoint.startsWith('/seller/register')") &&
    client.includes('state.auth.accessToken || state.sellerAuth.accessToken'),
  'the client must attach the seller token to /seller/register when no customer token exists',
);

// ── the section shows statuses + re-verification behavior ──────────────────
const section = read('src/components/seller-dashboard/SellerKycSection.tsx');
assert.ok(section.includes("queryKey: ['seller-kyc-status']"), 'KYC section must query the shared status lane');
assert.ok(section.includes('formData.append(docType, file)'), 'KYC upload must key files by doc type');
assert.ok(section.includes("'Not uploaded'"), 'missing documents must read "Not uploaded"');
assert.ok(section.includes("'Under review'"), 'uploaded-but-unverified documents must read "Under review"');
assert.ok(section.includes("'Verified'"), 'verified documents must read "Verified"');
assert.ok(section.includes('sent for re-verification'), 'replace must surface the re-verification reset');

console.log('OK: seller settings KYC section reuses the document lane + admin verify queue.');
