import { DailyEntry, AuthUser, AppState } from './types';

const ENTRIES_KEY = 'family_cost_data_v2';
const USER_KEY = 'family_cost_user_v2';
const LAST_SYNC_KEY = 'family_cost_last_sync_v2';

// Hardcoded Admin Credentials
const ADMIN_EMAIL = 'mehedi.admin@gmail.com';
const ADMIN_PASS = '123456';

// Unique bucket for the admin account
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
 * Pushes data to cloud immediately. 
 * Includes a timestamp to ensure order of operations.
 */
export const pushToCloud = async (entries: DailyEntry[]): Promise<boolean> => {
  try {
    const payload = {
      entries,
      updatedAt: Date.now(),
      v: 2
    };
    
    const response = await fetch(CLOUD_STORAGE_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
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
 * Pulls from cloud with cache-busting to ensure "Live" feel.
 */
export const pullFromCloud = async (): Promise<{ entries: DailyEntry[], updatedAt: number } | null> => {
  try {
    // Add cache-busting query param to bypass browser/network caching
    const response = await fetch(`${CLOUD_STORAGE_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      // Basic validation to ensure we got real data
      if (data && Array.isArray(data.entries)) {
        return data;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
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