import { DailyEntry, AuthUser } from './types';

const ENTRIES_KEY = 'fleet_track_data_v1';
const USER_KEY = 'fleet_track_user_v1';
const REGISTERED_USERS_KEY = 'fleet_track_reg_users_v1';

export const saveEntries = (entries: DailyEntry[]): void => {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
};

export const getEntries = (): DailyEntry[] => {
  const data = localStorage.getItem(ENTRIES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse storage data", e);
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

export const getRegisteredUsers = (): Record<string, string> => {
  const data = localStorage.getItem(REGISTERED_USERS_KEY);
  return data ? JSON.parse(data) : {};
};

export const registerUser = (email: string, pass: string): void => {
  const users = getRegisteredUsers();
  users[email] = pass;
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
};