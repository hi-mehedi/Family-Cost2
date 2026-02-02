import { DailyEntry, AuthUser } from './types';

const ENTRIES_KEY = 'family_cost_master_v20';
const USER_KEY = 'family_cost_user_master_v20';

// Hardcoded Admin Credentials
const ADMIN_EMAIL = 'mehedi.admin@gmail.com';
const ADMIN_PASS = '123456';

/**
 * MASTER CLOUD TUNNEL V20
 * We use a unique bucket and a specific key.
 * KVDB.io allows POST to set a value.
 */
const BUCKET_ID = 'Mehedi_Fleet_V20';
const CLOUD_STORAGE_URL = `https://kvdb.io/${BUCKET_ID}/fleet_master`;

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
 * Sends the entire state to the cloud.
 */
export const pushToCloud = async (entries: DailyEntry[]): Promise<boolean> => {
  try {
    const payload = {
      entries,
      updatedAt: Date.now(),
      device: navigator.userAgent.includes('Mobi') ? 'Mobile' : 'Laptop'
    };
    
    // We use a POST request with no custom headers to avoid CORS Preflight blocks on mobile
    const response = await fetch(CLOUD_STORAGE_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      mode: 'cors'
    });

    return response.ok;
  } catch (e) {
    console.error("V20 Push Failed:", e);
    return false;
  }
};

/**
 * MASTER CLOUD PULL
 * Fetches the shared record with aggressive cache-busting.
 */
export const pullFromCloud = async (): Promise<{ entries: DailyEntry[], updatedAt: number } | null> => {
  try {
    // Add a unique timestamp to every request to force the mobile browser to fetch REAL data
    const buster = Date.now();
    const response = await fetch(`${CLOUD_STORAGE_URL}?t=${buster}`, {
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
    console.error("V20 Pull Failed:", e);
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