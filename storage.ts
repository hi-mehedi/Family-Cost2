import { DailyEntry, AuthUser } from './types';

const ENTRIES_KEY = 'family_cost_master_v22';
const USER_KEY = 'family_cost_user_master_v22';

// Hardcoded Admin Credentials
const ADMIN_EMAIL = 'mehedi.admin@gmail.com';
const ADMIN_PASS = '123456';

/**
 * MASTER CLOUD TUNNEL V22
 * Uses a new bucket ID for Family Cost to ensure a fresh start.
 */
const BUCKET_ID = 'Family_Cost_V22';

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
    localStorage.removeItem(ENTRIES_KEY);
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
 * MASTER CLOUD PUSH
 * Pushes data to a unique key defined by the user's sync token.
 */
export const pushToCloud = async (entries: DailyEntry[], token: string): Promise<boolean> => {
  if (!token) return false;
  try {
    const payload = {
      entries,
      updatedAt: Date.now(),
      sender: navigator.userAgent.includes('Mobi') ? 'Mobile' : 'Laptop'
    };
    
    const url = `https://kvdb.io/${BUCKET_ID}/${token}`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain' // Simplified header to avoid CORS preflight issues on some mobile browsers
      }
    });

    return response.ok;
  } catch (e) {
    console.error("Cloud Push Failed:", e);
    return false;
  }
};

/**
 * MASTER CLOUD PULL
 * Pulls data from the cloud using the sync token.
 */
export const pullFromCloud = async (token: string): Promise<{ entries: DailyEntry[], updatedAt: number } | null> => {
  if (!token) return null;
  try {
    const url = `https://kvdb.io/${BUCKET_ID}/${token}?cache_bust=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (response.status === 404) {
      return { entries: [], updatedAt: 0 };
    }

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.entries)) {
        return data;
      }
    }
    return null;
  } catch (e) {
    console.error("Cloud Pull Failed:", e);
    return null;
  }
};

export const importState = (token: string): boolean => {
  try {
    const decoded = atob(token);
    const data = JSON.parse(decoded);
    if (data && Array.isArray(data.entries)) {
      saveEntriesLocally(data.entries);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};
