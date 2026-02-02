import { DailyEntry, AuthUser } from './types';

const ENTRIES_KEY = 'family_cost_master_v30';
const USER_KEY = 'family_cost_user_master_v30';

// Hardcoded Admin Credentials
const ADMIN_EMAIL = 'mehedi.admin@gmail.com';
const ADMIN_PASS = '123456';

/**
 * MASTER CLOUD TUNNEL V30 - "Master-Pulse"
 * Using a fresh bucket for the Family Cost rebrand.
 */
const BUCKET_ID = 'Family_Cost_Pulse_V30';

export const saveEntriesLocally = (entries: DailyEntry[]): void => {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
};

export const getEntriesLocally = (): DailyEntry[] => {
  const data = localStorage.getItem(ENTRIES_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
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
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

export const validateAdmin = (email: string, pass: string): boolean => {
  return email.toLowerCase() === ADMIN_EMAIL && pass === ADMIN_PASS;
};

/**
 * PUSH TO CLOUD
 * Sends local data to the global token channel.
 */
export const pushToCloud = async (entries: DailyEntry[], token: string): Promise<boolean> => {
  if (!token) return false;
  try {
    const payload = {
      entries,
      updatedAt: Date.now(),
      v: 30,
      client: navigator.userAgent.includes('Mobi') ? 'Mobile' : 'Laptop'
    };
    
    const url = `https://kvdb.io/${BUCKET_ID}/${token}`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      mode: 'cors'
    });

    return response.ok;
  } catch (e) {
    console.error("Cloud Broadcast Failed:", e);
    return false;
  }
};

/**
 * PULL FROM CLOUD
 * Fetches the most recent global state for the token.
 */
export const pullFromCloud = async (token: string): Promise<{ entries: DailyEntry[], updatedAt: number } | null> => {
  if (!token) return null;
  try {
    // Aggressive cache busting with random noise + timestamp
    const noise = Math.random().toString(36).substring(7);
    const url = `https://kvdb.io/${BUCKET_ID}/${token}?cb=${Date.now()}&n=${noise}`;
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
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
    console.error("Cloud Pulse Failed:", e);
    return null;
  }
};
