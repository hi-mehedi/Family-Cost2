import { DailyEntry, AuthUser, AppState } from './types';

const ENTRIES_KEY = 'family_cost_data_v2';
const USER_KEY = 'family_cost_user_v2';
const LAST_SYNC_KEY = 'family_cost_last_sync_v2';

// Hardcoded Admin Credentials
const ADMIN_EMAIL = 'mehedi.admin@gmail.com';
const ADMIN_PASS = '123456';

// Public KV storage for "Live Sync" without a backend.
// This bucket is unique to this app version and admin email.
const CLOUD_STORAGE_URL = 'https://kvdb.io/FamilyCost_Mehedi_Live_V1/state';

export const saveEntriesLocally = (entries: DailyEntry[]): void => {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
};

export const getEntriesLocally = (): DailyEntry[] => {
  const data = localStorage.getItem(ENTRIES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const saveUser = (user: AuthUser | null): void => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
};

export const getUser = (): AuthUser | null => {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  return JSON.parse(data);
};

export const validateAdmin = (email: string, pass: string): boolean => {
  return email.toLowerCase() === ADMIN_EMAIL && pass === ADMIN_PASS;
};

/**
 * Pushes the current state to the cloud for other devices to see.
 */
export const pushToCloud = async (entries: DailyEntry[]): Promise<boolean> => {
  try {
    const response = await fetch(CLOUD_STORAGE_URL, {
      method: 'POST',
      body: JSON.stringify({
        entries,
        updatedAt: Date.now(),
        client: 'Mehedi_Mobile'
      }),
    });
    if (response.ok) {
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      return true;
    }
    return false;
  } catch (e) {
    console.error("Cloud push failed", e);
    return false;
  }
};

/**
 * Pulls the latest state from the cloud.
 */
export const pullFromCloud = async (): Promise<{ entries: DailyEntry[], updatedAt: number } | null> => {
  try {
    const response = await fetch(CLOUD_STORAGE_URL);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (e) {
    return null;
  }
};

// Keeping legacy sync as a backup
export const exportState = (): string => {
  const state: AppState = {
    entries: getEntriesLocally(),
    user: getUser()!,
    registeredUsers: { [ADMIN_EMAIL]: ADMIN_PASS }
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
};

export const importState = (token: string): boolean => {
  try {
    const decoded = decodeURIComponent(escape(atob(token)));
    const state: AppState = JSON.parse(decoded);
    if (state.entries && state.user) {
      saveEntriesLocally(state.entries);
      saveUser(state.user);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};