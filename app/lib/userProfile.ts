import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from './firebase';

export interface UserPreferences {
  motionCapture: boolean;
  instructorVoice: boolean;
  workoutMusic: boolean;
  reminders: boolean;
}

export interface UserProfile {
  name?: string;
  experienceLevel?: string;
  equipment?: string;
  height?: string;
  heightUnit?: string;
  weight?: string;
  weightUnit?: string;
  birthday?: string;
  mindfulAreas?: string[];
  goals?: string[];
  targetAreas?: string[];
  trainingFrequency?: string;
  preferences?: UserPreferences;
  createdAt?: string;
  updatedAt?: string;
}

export type ProfileEditSection = 'about' | 'body' | 'mindful';

export const MINDFUL_AREA_OPTIONS = [
  'Lower back',
  'Tight Hips',
  'Knee sensitivity',
  'Shoulder injury',
  'Neck Tension',
  'Other',
  'None',
] as const;

export const EXPERIENCE_LEVEL_OPTIONS = [
  'Beginner',
  'Intermediate',
  'Advanced',
] as const;

export const EQUIPMENT_OPTIONS = [
  'Reformer',
  'Mat',
  'Resistance Bands',
] as const;

export async function fetchUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as UserProfile;
}

export async function saveUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      ...data,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  motionCapture: true,
  instructorVoice: true,
  workoutMusic: true,
  reminders: false,
};

export function getProfileInitial(name?: string, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '?';
  return source.charAt(0).toUpperCase();
}

export function formatProfileSubtitle(profile: UserProfile | null): string {
  if (!profile?.experienceLevel && !profile?.equipment) {
    return 'Complete your profile';
  }

  const parts = [profile.experienceLevel, profile.equipment].filter(Boolean);
  return parts.join(' · ');
}

export function formatMindfulAreas(areas?: string[]): string {
  if (!areas?.length) {
    return 'None selected';
  }

  const filtered = areas.filter(
    (area) => area.toLowerCase() !== 'none'
  );

  if (!filtered.length) {
    return 'None selected';
  }

  return filtered.join(', ');
}

export function formatHeight(profile: UserProfile | null): string {
  if (!profile?.height) {
    return '—';
  }
  return `${profile.height} ${profile.heightUnit ?? 'cm'}`.trim();
}

export function formatWeight(profile: UserProfile | null): string {
  if (!profile?.weight) {
    return '—';
  }
  return `${profile.weight} ${profile.weightUnit ?? 'kg'}`.trim();
}

export function getAgeFromBirthday(birthday?: string): string {
  if (!birthday?.trim()) {
    return '—';
  }

  let dob: Date | null = null;
  const slashMatch = birthday.match(
    /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/
  );

  if (slashMatch) {
    const month = Number(slashMatch[1]) - 1;
    const day = Number(slashMatch[2]);
    const yearRaw = slashMatch[3];
    const year =
      yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
    dob = new Date(year, month, day);
  } else {
    const parsed = new Date(birthday);
    if (!Number.isNaN(parsed.getTime())) {
      dob = parsed;
    }
  }

  if (!dob || Number.isNaN(dob.getTime())) {
    return '—';
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? String(age) : '—';
}

export function shouldShowMindfulCard(areas?: string[]): boolean {
  if (!areas?.length) {
    return false;
  }

  return areas.some((area) => area.toLowerCase() !== 'none');
}
