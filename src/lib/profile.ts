// The "Where I stand" profile. Stored only in the visitor's browser (localStorage).
import type { Visa } from './eoi';

export interface Profile {
  code: string;
  name: string;
  visa: Visa;
  /** A state code, "ANY", or "" when not chosen. */
  state: string;
  points: number;
}

export const PROFILE_KEY = 'visaradar.profile.v1';
export const PROFILE_EVENT = 'visaradar:profile';

const VISAS = ['189', '190', '491', '491F'];

export function parseProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.code !== 'string' || !/^\d{6}$/.test(p.code)) return null;
  if (typeof p.visa !== 'string' || !VISAS.includes(p.visa)) return null;
  const points = Number(p.points);
  if (!Number.isFinite(points) || points < 0 || points > 200) return null;
  return {
    code: p.code,
    name: typeof p.name === 'string' ? p.name : '',
    visa: p.visa as Visa,
    state: typeof p.state === 'string' ? p.state : '',
    points: Math.round(points),
  };
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? parseProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
}

/** Points scores in SkillSelect move in steps of 5. */
export function roundPoints(n: number): number {
  return Math.round(n / 5) * 5;
}
