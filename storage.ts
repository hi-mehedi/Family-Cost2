import { DailyEntry, AuthUser, AppState } from './types';

const ENTRIES_KEY = 'family_cost_master_v9';
const USER_KEY = 'family_cost_user_master_v9';

// Hardcoded Admin Credentials
const ADMIN_EMAIL = 'mehedi.admin@gmail.com';
const ADMIN_PASS = '123456';

/**
 * MASTER CLOUD TUNNEL
 * This is the shared database URL. 
 * Using a fresh bucket (V9) to ensure total sync between Laptop and Mobile.
 */
const CLOUD_BUCKET = 'https://kvdb.io/Mehedi_Master_Fleet_V9/master_record';

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
    localStorage.removeItem(ENTRIES_KEY); // Clear data on logout to force fresh sync on next login
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
 * PUSH TO MASTER CLOUD
 * Broadcasts data from Laptop/Mobile to the shared bucket.
 */
export const pushToCloud = async (entries: DailyEntry[]): Promise<boolean> => {
  try {
    const payload = {
      entries,
      updatedAt: Date.now(),
      sender: navigator.userAgent.includes('Mobi') ? 'Mobile' : 'Laptop'
    };
    
    const response = await fetch(CLOUD_BUCKET, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  } catch (e) {
    console.error("Master Push Error:", e);
    return false;
  }
};

/**
 * PULL FROM MASTER CLOUD
 * Gets the absolute latest data from the shared bucket.
 * Uses 'no-store' and random query params to defeat mobile browser caching.
 */
export const pullFromCloud = async (): Promise<{ entries: DailyEntry[], updatedAt: number } | null> => {
  try {
    // Generate a unique cache-buster for every single pull
    const cacheBuster = Math.random().toString(36).substring(7);
    const response = await fetch(`${CLOUD_BUCKET}?nocache=${cacheBuster}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.entries)) {
        return data;
      }
    }
    return null;
  } catch (e) {
    console.error("Master Pull Error:", e);
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