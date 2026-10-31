import {
  CreatorConfig,
  GeneratedKeyRecord,
  LicenseAccessMode,
  LicenseEvaluation,
  LicenseHistoryRecord,
  LicenseState,
} from '../types';

const LICENSE_STORAGE_KEYS = {
  STATE: 'vyaparpos_license_state_v1',
  KEYGEN_REGISTRY: 'vyaparpos_keygen_registry_v1',
  CREATOR_CONFIG: 'vyaparpos_creator_config_v2',
  LEGACY_CREATOR_CONFIG: 'vyaparpos_creator_config_v1',
};

// Base32 Crockford-style unambiguous alphabet (excludes 0, 1, I, O) — exact 32 chars
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EPOCH_START_MS = Date.UTC(2025, 0, 1, 0, 0, 0);
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MASK64 = 0xffffffffffffffffn;
const MASK68 = (1n << 68n) - 1n;
const MASK32 = 0xffffffffn;

// Public 2-Day Trial Login & Public License Key Constants
export const PUBLIC_LOGIN_ID = 'PUBLIC-USER';
export const PUBLIC_LOGIN_PASSWORD = 'Public@2Days';
export const PUBLIC_2DAY_LICENSE_KEY = 'VYPR-PUBL-2DAY-FREE-DEMO-2026';
export const PUBLIC_TRIAL_DURATION_DAYS = 2;

// Master signing secret for VyaparPOS offline cryptographic verification
const MASTER_SIGNING_SECRET = 'VYAPARPOS::ANNUAL-LICENSE-V1::9F84A2C7E1B5D306';

function splitMix64(x: bigint): bigint {
  let z = (x + 0x9e3779b97f4a7c15n) & MASK64;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
  return (z ^ (z >> 31n)) & MASK64;
}

function deriveSecretKeys(secret: string): [bigint, bigint] {
  let h0 = 0x243f6a8885a308d3n;
  let h1 = 0x13198a2e03707344n;
  for (let i = 0; i < secret.length; i++) {
    const code = BigInt(secret.charCodeAt(i));
    h0 = splitMix64(h0 ^ code);
    h1 = splitMix64(h1 + (code << 8n));
  }
  return [h0, h1];
}

const [SECRET_K0, SECRET_K1] = deriveSecretKeys(MASTER_SIGNING_SECRET);

// Precomputed salted 256-bit digests for exclusive Creator Login ID & Password (no plaintext stored)
export const DEFAULT_CREATOR_ID_HASH =
  '60d7e7992063126fc258fd1ebbd77902c5d57f4a4224fdcebcf0a4c909595e80';
export const DEFAULT_CREATOR_PASSWORD_HASH =
  'c11e3b9debcd32d6fdc18f54363a545ddedf869268fb2208dfba2197c179614d';

/**
 * Computes a salted 256-bit cryptographic digest for Creator ID or Creator Password.
 * Creator ID is normalized (trimmed & uppercased); Creator Password is exact case-sensitive (trimmed).
 */
export function computeCreatorCredentialHash(domain: 'id' | 'pass', rawValue: string): string {
  const normalized = domain === 'id' ? rawValue.trim().toUpperCase() : rawValue.trim();
  const salted = `VYAPARPOS::CREATOR-AUTH-V2::${domain}::${normalized}::7C9E4A1D8B2F`;
  let s0 = 0x6a09e667f3bcc908n;
  let s1 = 0xbb67ae8584caa73bn;
  let s2 = 0x3c6ef372fe94f82bn;
  let s3 = 0xa54ff53a5f1d36f1n;
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < salted.length; i++) {
      const c = BigInt(salted.charCodeAt(i)) + BigInt(round * 131 + i);
      s0 = splitMix64(s0 ^ c);
      s1 = splitMix64(s1 + (s0 ^ (c << 7n)));
      s2 = splitMix64(s2 ^ (s1 + (c << 13n)));
      s3 = splitMix64(s3 + (s2 ^ (c << 19n)));
    }
  }
  return [s0, s1, s2, s3].map(v => v.toString(16).padStart(16, '0')).join('');
}

export function verifyPublicLoginCredentials(loginId: string, password: string): boolean {
  return (
    loginId.trim().toUpperCase() === PUBLIC_LOGIN_ID &&
    password.trim() === PUBLIC_LOGIN_PASSWORD
  );
}

/**
 * Normalizes an installation ID (e.g. "POS-8K4M-9X2P" -> "POS8K4M9X2P")
 * and computes a non-zero 16-bit hash (1..65535). 0 is reserved for Universal keys.
 */
export function normalizeInstallationId(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function computeInstallationHash16(installationId: string): number {
  const clean = normalizeInstallationId(installationId);
  if (!clean) return 0;
  let acc = 0x811c9dc5n;
  for (let i = 0; i < clean.length; i++) {
    acc ^= BigInt(clean.charCodeAt(i));
    acc = splitMix64(acc);
  }
  const h16 = Number(acc & 0xffffn);
  return h16 === 0 ? 1 : h16;
}

function computeSignature32(payload68: bigint): bigint {
  const low64 = payload68 & MASK64;
  const high4 = (payload68 >> 64n) & 0xfn;
  const r1 = splitMix64(low64 ^ SECRET_K0);
  const r2 = splitMix64(((low64 >> 24n) ^ (high4 << 48n) ^ SECRET_K1) + 0x517cc1b727220a95n);
  const combined = splitMix64(r1 ^ r2);
  return combined & MASK32;
}

function computeStreamMask68(sig32: bigint): bigint {
  const low64 = splitMix64((sig32 << 17n) ^ sig32 ^ SECRET_K1);
  const high4 = splitMix64(sig32 ^ SECRET_K0) & 0xfn;
  return ((high4 << 64n) | low64) & MASK68;
}

export function getPlanLabelForDays(days: number): string {
  if (days === 365) return '1-Year Annual License';
  if (days === 730) return '2-Year Multi-Year License';
  if (days === 1095) return '3-Year Enterprise License';
  if (days === 180) return '6-Month Half-Yearly License';
  if (days === 30) return '30-Day Monthly License';
  return `${days}-Day Custom License`;
}

/**
 * Formats user input progressively as VYPR-XXXX-XXXX-XXXX-XXXX-XXXX
 */
export function formatLicenseKeyInput(raw: string): string {
  let cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('VYPR')) {
    cleaned = cleaned.slice(4);
  }
  cleaned = cleaned.slice(0, 20);
  if (cleaned.length === 0) return '';
  const groups: string[] = ['VYPR'];
  for (let i = 0; i < cleaned.length; i += 4) {
    groups.push(cleaned.slice(i, i + 4));
  }
  return groups.join('-');
}

export function canonicalizeLicenseKey(raw: string): string {
  let cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('VYPR')) {
    cleaned = cleaned.slice(4);
  }
  if (cleaned.length !== 20) return raw.trim().toUpperCase();
  return [
    'VYPR',
    cleaned.slice(0, 4),
    cleaned.slice(4, 8),
    cleaned.slice(8, 12),
    cleaned.slice(12, 16),
    cleaned.slice(16, 20),
  ].join('-');
}

/**
 * Generates a brand-new cryptographically signed License Key.
 * Default duration is 365 days (1 Year Annual Renewal).
 */
export function createSignedLicenseKey(options?: {
  durationDays?: number;
  targetInstallationId?: string;
}): {
  licenseKey: string;
  durationDays: number;
  planLabel: string;
  isDeviceBound: boolean;
} {
  const durationDays = Math.max(1, Math.min(3650, Math.floor(options?.durationDays ?? 365)));
  const nowMs = Date.now();
  const daysSinceEpoch = Math.max(0, Math.min(65535, Math.floor((nowMs - EPOCH_START_MS) / MS_PER_DAY)));

  // 20-bit random nonce so every generated key is strictly unique
  let randomVal = Math.floor(Math.random() * 0x100000);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    randomVal = arr[0] & 0xfffff;
  }

  const installHash = options?.targetInstallationId?.trim()
    ? computeInstallationHash16(options.targetInstallationId)
    : 0;

  const version = 1n;
  const payload68 =
    ((version & 0xfn) << 64n) |
    ((BigInt(durationDays) & 0xfffn) << 52n) |
    ((BigInt(daysSinceEpoch) & 0xffffn) << 36n) |
    ((BigInt(randomVal) & 0xfffffn) << 16n) |
    (BigInt(installHash) & 0xffffn);

  const sig32 = computeSignature32(payload68);
  const maskedPayload68 = (payload68 ^ computeStreamMask68(sig32)) & MASK68;
  const token100 = (maskedPayload68 << 32n) | sig32;

  let chars = '';
  for (let shift = 95n; shift >= 0n; shift -= 5n) {
    const idx = Number((token100 >> shift) & 0x1fn);
    chars += ALPHABET[idx];
  }

  const licenseKey = [
    'VYPR',
    chars.slice(0, 4),
    chars.slice(4, 8),
    chars.slice(8, 12),
    chars.slice(12, 16),
    chars.slice(16, 20),
  ].join('-');

  return {
    licenseKey,
    durationDays,
    planLabel: getPlanLabelForDays(durationDays),
    isDeviceBound: installHash !== 0,
  };
}

export interface DecodedLicenseKeyResult {
  valid: boolean;
  error?: string;
  canonicalKey?: string;
  durationDays?: number;
  issuedDate?: string;
  nonce?: number;
  isDeviceBound?: boolean;
  planLabel?: string;
}

/**
 * Validates a license key offline using signature verification, device-binding check,
 * and single-use anti-replay check (so old keys can NEVER be reused on renewal).
 */
export function verifyLicenseKey(
  rawKey: string,
  currentInstallationId: string,
  usedKeys: string[]
): DecodedLicenseKeyResult {
  let cleaned = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('VYPR')) {
    cleaned = cleaned.slice(4);
  }

  if (cleaned.length !== 20) {
    return {
      valid: false,
      error: 'लाइसेंस की का प्रारूप गलत है। कृपया पूरी 20-अक्षरों की VYPR की दर्ज करें (VYPR-XXXX-XXXX-XXXX-XXXX-XXXX)।',
    };
  }

  let token100 = 0n;
  for (let i = 0; i < 20; i++) {
    const ch = cleaned[i];
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) {
      return {
        valid: false,
        error: `अमान्य अक्षर "${ch}" पाया गया। कृपया सही लाइसेंस की कॉपी-पेस्ट करें।`,
      };
    }
    token100 = (token100 << 5n) | BigInt(idx);
  }

  const sig32 = token100 & MASK32;
  const maskedPayload68 = (token100 >> 32n) & MASK68;
  const payload68 = (maskedPayload68 ^ computeStreamMask68(sig32)) & MASK68;

  const expectedSig32 = computeSignature32(payload68);
  if (expectedSig32 !== sig32) {
    return {
      valid: false,
      error: 'अमान्य लाइसेंस की (Invalid License Key)। केवल एडमिन/क्रिएटर द्वारा जनरेट की गई मान्य की ही स्वीकार होगी।',
    };
  }

  const version = Number((payload68 >> 64n) & 0xfn);
  const durationDays = Number((payload68 >> 52n) & 0xfffn);
  const issuedDaysSinceEpoch = Number((payload68 >> 36n) & 0xffffn);
  const nonce = Number((payload68 >> 16n) & 0xfffffn);
  const installHash = Number(payload68 & 0xffffn);

  if (version !== 1 || durationDays < 1 || durationDays > 3650) {
    return {
      valid: false,
      error: 'लाइसेंस की का संस्करण अमान्य है (Unsupported License Version)।',
    };
  }

  if (installHash !== 0) {
    const localHash = computeInstallationHash16(currentInstallationId);
    if (installHash !== localHash) {
      return {
        valid: false,
        error: `यह लाइसेंस की किसी अन्य सिस्टम के लिए लॉक है। आपके सिस्टम की ID (${currentInstallationId}) से मेल नहीं खाती।`,
      };
    }
  }

  const canonicalKey = [
    'VYPR',
    cleaned.slice(0, 4),
    cleaned.slice(4, 8),
    cleaned.slice(8, 12),
    cleaned.slice(12, 16),
    cleaned.slice(16, 20),
  ].join('-');

  if (usedKeys.includes(canonicalKey)) {
    return {
      valid: false,
      error: 'यह लाइसेंस की पहले ही उपयोग की जा चुकी है! वार्षिक रिन्यूअल (Renewal) के लिए कृपया नई जनरेट की गई लाइसेंस की दर्ज करें।',
    };
  }

  const issuedDate = new Date(EPOCH_START_MS + issuedDaysSinceEpoch * MS_PER_DAY).toISOString();

  return {
    valid: true,
    canonicalKey,
    durationDays,
    issuedDate,
    nonce,
    isDeviceBound: installHash !== 0,
    planLabel: getPlanLabelForDays(durationDays),
  };
}

function generateNewInstallationId(): string {
  const seg = () => {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return s;
  };
  return `POS-${seg()}-${seg()}`;
}

export function evaluateLicenseStatus(state: LicenseState): LicenseEvaluation {
  // 1. Creator Lifetime Mode — ALWAYS VALID (Never expires, never locks)
  if (state.accessMode === 'creator_lifetime') {
    return {
      status: 'creator_always_valid',
      accessMode: 'creator_lifetime',
      isLockedByLicense: false,
      isCreatorLifetime: true,
      isPublicTrial: false,
      daysRemaining: 99999,
      hoursRemaining: 999999,
      totalDays: 365,
      progressPercent: 100,
      expiresAt: null,
      activatedAt: state.activatedAt || state.lastVerifiedAt || new Date().toISOString(),
    };
  }

  // 2. Unactivated state
  if (!state.activeKey || !state.expiresAt || !state.activatedAt || state.accessMode === 'unactivated') {
    return {
      status: 'unactivated',
      accessMode: 'unactivated',
      isLockedByLicense: true,
      isCreatorLifetime: false,
      isPublicTrial: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      totalDays: state.durationDays || 365,
      progressPercent: 0,
      expiresAt: null,
      activatedAt: null,
    };
  }

  const now = Date.now();
  const lastVerifiedMs = state.lastVerifiedAt ? new Date(state.lastVerifiedAt).getTime() : now;
  const isPublic =
    state.accessMode === 'public_trial' || state.activeKey === PUBLIC_2DAY_LICENSE_KEY;
  const resolvedMode: LicenseAccessMode = isPublic ? 'public_trial' : 'annual_license';

  // Detect backward system clock tampering (> 2h for 2-day public trial, > 24h for annual)
  const tamperThresholdMs = isPublic ? 2 * MS_PER_HOUR : MS_PER_DAY;
  if (!Number.isNaN(lastVerifiedMs) && now < lastVerifiedMs - tamperThresholdMs) {
    return {
      status: 'clock_tampered',
      accessMode: resolvedMode,
      isLockedByLicense: true,
      isCreatorLifetime: false,
      isPublicTrial: isPublic,
      daysRemaining: 0,
      hoursRemaining: 0,
      totalDays: state.durationDays || (isPublic ? PUBLIC_TRIAL_DURATION_DAYS : 365),
      progressPercent: 0,
      expiresAt: state.expiresAt,
      activatedAt: state.activatedAt,
    };
  }

  const expiresMs = new Date(state.expiresAt).getTime();
  const totalDays = Math.max(1, state.durationDays || (isPublic ? PUBLIC_TRIAL_DURATION_DAYS : 365));

  if (now >= expiresMs) {
    return {
      status: 'expired',
      accessMode: resolvedMode,
      isLockedByLicense: true,
      isCreatorLifetime: false,
      isPublicTrial: isPublic,
      daysRemaining: 0,
      hoursRemaining: 0,
      totalDays,
      progressPercent: 0,
      expiresAt: state.expiresAt,
      activatedAt: state.activatedAt,
    };
  }

  const msLeft = expiresMs - now;
  const hoursRemaining = Math.max(1, Math.ceil(msLeft / MS_PER_HOUR));
  const daysRemaining = Math.max(1, Math.ceil(msLeft / MS_PER_DAY));

  if (isPublic) {
    const totalMs = PUBLIC_TRIAL_DURATION_DAYS * MS_PER_DAY;
    const progressPercent = Math.min(100, Math.max(0, Math.round((msLeft / totalMs) * 100)));
    return {
      status: 'public_trial_active',
      accessMode: 'public_trial',
      isLockedByLicense: false,
      isCreatorLifetime: false,
      isPublicTrial: true,
      daysRemaining,
      hoursRemaining,
      totalDays: PUBLIC_TRIAL_DURATION_DAYS,
      progressPercent,
      expiresAt: state.expiresAt,
      activatedAt: state.activatedAt,
    };
  }

  const progressPercent = Math.min(100, Math.max(0, Math.round((daysRemaining / totalDays) * 100)));

  return {
    status: daysRemaining <= 30 ? 'expiring_soon' : 'active',
    accessMode: 'annual_license',
    isLockedByLicense: false,
    isCreatorLifetime: false,
    isPublicTrial: false,
    daysRemaining,
    hoursRemaining,
    totalDays,
    progressPercent,
    expiresAt: state.expiresAt,
    activatedAt: state.activatedAt,
  };
}

export const LicenseStorage = {
  getLicenseState(): LicenseState {
    try {
      const raw = localStorage.getItem(LICENSE_STORAGE_KEYS.STATE);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LicenseState>;
        if (parsed && parsed.installationId) {
          const inferredMode: LicenseAccessMode =
            parsed.accessMode ||
            (parsed.activeKey === PUBLIC_2DAY_LICENSE_KEY
              ? 'public_trial'
              : parsed.activeKey
              ? 'annual_license'
              : 'unactivated');

          return {
            installationId: parsed.installationId,
            accessMode: inferredMode,
            activeKey: parsed.activeKey ?? null,
            activatedAt: parsed.activatedAt ?? null,
            expiresAt: parsed.expiresAt ?? null,
            durationDays: parsed.durationDays || 365,
            planLabel: parsed.planLabel || '1-Year Annual License',
            usedKeys: Array.isArray(parsed.usedKeys) ? parsed.usedKeys : [],
            history: Array.isArray(parsed.history) ? parsed.history : [],
            lastVerifiedAt: parsed.lastVerifiedAt || new Date().toISOString(),
            publicTrialUsed: Boolean(parsed.publicTrialUsed),
            publicTrialStartedAt: parsed.publicTrialStartedAt ?? null,
            publicTrialExpiresAt: parsed.publicTrialExpiresAt ?? null,
          };
        }
      }
    } catch {
      // fallback to fresh state
    }

    const initial: LicenseState = {
      installationId: generateNewInstallationId(),
      accessMode: 'unactivated',
      activeKey: null,
      activatedAt: null,
      expiresAt: null,
      durationDays: 365,
      planLabel: '1-Year Annual License',
      usedKeys: [],
      history: [],
      lastVerifiedAt: new Date().toISOString(),
      publicTrialUsed: false,
      publicTrialStartedAt: null,
      publicTrialExpiresAt: null,
    };
    this.saveLicenseState(initial);
    return initial;
  },

  saveLicenseState(state: LicenseState) {
    try {
      localStorage.setItem(LICENSE_STORAGE_KEYS.STATE, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  },

  getGeneratedKeys(): GeneratedKeyRecord[] {
    try {
      const raw = localStorage.getItem(LICENSE_STORAGE_KEYS.KEYGEN_REGISTRY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  },

  saveGeneratedKeys(records: GeneratedKeyRecord[]) {
    try {
      localStorage.setItem(LICENSE_STORAGE_KEYS.KEYGEN_REGISTRY, JSON.stringify(records));
    } catch {
      // ignore
    }
  },

  getCreatorConfig(): CreatorConfig {
    const defaults: CreatorConfig = {
      creatorIdHash: DEFAULT_CREATOR_ID_HASH,
      creatorPasswordHash: DEFAULT_CREATOR_PASSWORD_HASH,
      vendorName: 'VyaparPOS Software Admin',
      vendorPhone: '',
      failedAttempts: 0,
      lockoutUntil: null,
    };
    try {
      // Remove legacy plaintext PIN config if present
      localStorage.removeItem(LICENSE_STORAGE_KEYS.LEGACY_CREATOR_CONFIG);
      const raw = localStorage.getItem(LICENSE_STORAGE_KEYS.CREATOR_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CreatorConfig>;
        return {
          creatorIdHash: parsed.creatorIdHash || defaults.creatorIdHash,
          creatorPasswordHash: parsed.creatorPasswordHash || defaults.creatorPasswordHash,
          vendorName: parsed.vendorName || defaults.vendorName,
          vendorPhone: parsed.vendorPhone ?? defaults.vendorPhone,
          failedAttempts: typeof parsed.failedAttempts === 'number' ? parsed.failedAttempts : 0,
          lockoutUntil: parsed.lockoutUntil ?? null,
        };
      }
    } catch {
      // ignore
    }
    return defaults;
  },

  saveCreatorConfig(config: CreatorConfig) {
    try {
      localStorage.setItem(LICENSE_STORAGE_KEYS.CREATOR_CONFIG, JSON.stringify(config));
    } catch {
      // ignore
    }
  },
};

export function activatePublicTrialState(
  currentState: LicenseState,
  rawKey: string,
  activatedBy: string
): { ok: boolean; updatedState?: LicenseState; message: string } {
  const canonical = canonicalizeLicenseKey(rawKey);
  if (canonical !== PUBLIC_2DAY_LICENSE_KEY) {
    return {
      ok: false,
      message: `पब्लिक ट्रायल के लिए मान्य 2-दिवसीय पब्लिक लाइसेंस की (${PUBLIC_2DAY_LICENSE_KEY}) दर्ज करें।`,
    };
  }

  const now = Date.now();
  const lastVerifiedMs = currentState.lastVerifiedAt
    ? new Date(currentState.lastVerifiedAt).getTime()
    : now;

  if (!Number.isNaN(lastVerifiedMs) && now < lastVerifiedMs - 2 * MS_PER_HOUR) {
    return {
      ok: false,
      message: 'सिस्टम घड़ी पीछे की गई है! कृपया सही समय सेट करें।',
    };
  }

  // If public trial was already started earlier on this device
  if (currentState.publicTrialUsed && currentState.publicTrialExpiresAt) {
    const prevExpiresMs = new Date(currentState.publicTrialExpiresAt).getTime();
    if (now >= prevExpiresMs) {
      return {
        ok: false,
        message:
          '2-दिन (48 घंटे) का पब्लिक लाइसेंस समाप्त हो चुका है! पब्लिक लॉगिन केवल एक बार 2 दिन के लिए मान्य होता है। आगे उपयोग के लिए Creator से 1-साल की नई लाइसेंस की लें।',
      };
    }

    const hoursLeft = Math.max(1, Math.ceil((prevExpiresMs - now) / MS_PER_HOUR));
    const resumedState: LicenseState = {
      ...currentState,
      accessMode: 'public_trial',
      activeKey: PUBLIC_2DAY_LICENSE_KEY,
      activatedAt: currentState.publicTrialStartedAt || new Date(now).toISOString(),
      expiresAt: currentState.publicTrialExpiresAt,
      durationDays: PUBLIC_TRIAL_DURATION_DAYS,
      planLabel: '2-Day Public License',
      lastVerifiedAt: new Date(now).toISOString(),
    };

    return {
      ok: true,
      updatedState: resumedState,
      message: `पब्लिक लॉगिन सक्रिय! आपके 2-दिवसीय पब्लिक लाइसेंस में ${hoursLeft} घंटे शेष हैं।`,
    };
  }

  const startedAtIso = new Date(now).toISOString();
  const expiresAtIso = new Date(now + PUBLIC_TRIAL_DURATION_DAYS * MS_PER_DAY).toISOString();

  const historyEntry: LicenseHistoryRecord = {
    id: `lic-pub-${now}`,
    licenseKey: PUBLIC_2DAY_LICENSE_KEY,
    activatedAt: startedAtIso,
    expiresAt: expiresAtIso,
    durationDays: PUBLIC_TRIAL_DURATION_DAYS,
    planLabel: '2-Day Public License',
    activatedBy,
    isDeviceBound: false,
  };

  const updatedState: LicenseState = {
    ...currentState,
    accessMode: 'public_trial',
    activeKey: PUBLIC_2DAY_LICENSE_KEY,
    activatedAt: startedAtIso,
    expiresAt: expiresAtIso,
    durationDays: PUBLIC_TRIAL_DURATION_DAYS,
    planLabel: '2-Day Public License',
    usedKeys: Array.from(new Set([...currentState.usedKeys, PUBLIC_2DAY_LICENSE_KEY])),
    history: [historyEntry, ...currentState.history],
    lastVerifiedAt: startedAtIso,
    publicTrialUsed: true,
    publicTrialStartedAt: startedAtIso,
    publicTrialExpiresAt: expiresAtIso,
  };

  return {
    ok: true,
    updatedState,
    message: '2-दिवसीय पब्लिक लाइसेंस (48 Hours) सफलतापूर्वक सक्रिय हो गया!',
  };
}

export function activateCreatorLifetimeState(currentState: LicenseState): LicenseState {
  const nowIso = new Date().toISOString();
  return {
    ...currentState,
    accessMode: 'creator_lifetime',
    lastVerifiedAt: nowIso,
  };
}

export function exitCreatorLifetimeState(currentState: LicenseState): LicenseState {
  let fallbackMode: LicenseAccessMode = 'unactivated';
  if (currentState.activeKey && currentState.activeKey !== PUBLIC_2DAY_LICENSE_KEY) {
    fallbackMode = 'annual_license';
  } else if (currentState.activeKey === PUBLIC_2DAY_LICENSE_KEY) {
    fallbackMode = 'public_trial';
  }
  return {
    ...currentState,
    accessMode: fallbackMode,
  };
}

export function applyLicenseActivation(
  currentState: LicenseState,
  verified: Required<
    Pick<DecodedLicenseKeyResult, 'canonicalKey' | 'durationDays' | 'isDeviceBound' | 'planLabel'>
  >,
  activatedBy: string
): LicenseState {
  const now = Date.now();
  // Stack remaining days ONLY if previous active license was a paid annual/custom license (not 2-day public trial)
  const wasAnnualLicense =
    currentState.accessMode === 'annual_license' &&
    currentState.activeKey !== PUBLIC_2DAY_LICENSE_KEY;
  const currentExpiryMs =
    wasAnnualLicense && currentState.expiresAt ? new Date(currentState.expiresAt).getTime() : 0;
  const baseStartMs = currentExpiryMs > now ? currentExpiryMs : now;
  const newExpiresMs = baseStartMs + verified.durationDays * MS_PER_DAY;

  const currentRemainingDays =
    currentExpiryMs > now ? Math.ceil((currentExpiryMs - now) / MS_PER_DAY) : 0;
  const effectiveTotalDays = verified.durationDays + currentRemainingDays;

  const activatedAtIso = new Date(now).toISOString();
  const expiresAtIso = new Date(newExpiresMs).toISOString();

  const historyEntry: LicenseHistoryRecord = {
    id: `lic-${now}`,
    licenseKey: verified.canonicalKey,
    activatedAt: activatedAtIso,
    expiresAt: expiresAtIso,
    durationDays: verified.durationDays,
    planLabel: verified.planLabel,
    activatedBy,
    isDeviceBound: verified.isDeviceBound,
  };

  return {
    ...currentState,
    accessMode: 'annual_license',
    activeKey: verified.canonicalKey,
    activatedAt: activatedAtIso,
    expiresAt: expiresAtIso,
    durationDays: effectiveTotalDays,
    planLabel: verified.planLabel,
    usedKeys: Array.from(new Set([...currentState.usedKeys, verified.canonicalKey])),
    history: [historyEntry, ...currentState.history],
    lastVerifiedAt: activatedAtIso,
  };
}
