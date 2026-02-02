import { DailyEntry, AuthUser } from './types';

const ENTRIES_KEY = 'family_cost_master_v13';
const USER_KEY = 'family_cost_user_master_v13';

// Hardcoded Admin Credentials
const ADMIN_EMAIL = 'mehedi.admin@gmail.com';
const ADMIN_PASS = '123456';

/**
 * MASTER CLOUD TUNNEL V13
 * Fresh bucket for Mehedi Hasan Soumik.
 * We use POST for maximum compatibility with mobile browser security policies.
 */
const BUCKET_ID = 'Mehedi_Fleet_Final_V13';
const CLOUD_STORAGE_URL = `https://kvdb.io/${BUCKET_ID}/master_record`;

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
 * Uses POST to update the cloud. 
 */
export const pushToCloud = async (entries: DailyEntry[]): Promise<boolean> => {
  try {
    const payload = {
      entries,
      updatedAt: Date.now()
    };
    
    // We use a simplified fetch to avoid triggering strict CORS preflights on mobile
    const response = await fetch(CLOUD_STORAGE_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain', // Using text/plain often bypasses strict CORS preflight checks
      }
    });

    return response.ok;
  } catch (e) {
    console.error("Master Sync Push Error:", e);
    return false;
  }
};

/**
 * MASTER CLOUD PULL
 * Fetches the shared record. 
 */
export const pullFromCloud = async (): Promise<{ entries: DailyEntry[], updatedAt: number } | null> => {
  try {
    const response = await fetch(`${CLOUD_STORAGE_URL}?cb=${Date.now()}`, {
      method: 'GET',
      mode: 'cors'
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
    console.error("Master Sync Pull Error:", e);
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