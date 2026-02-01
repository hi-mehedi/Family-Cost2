export type UnitName = "Car" | "Ris - Sharif-1" | "Ris - Sharif-2" | "Auto" | "Ris - Roman-1" | "Ris - Roman-2";

export interface UnitEntry {
  income: number;
  cost: number;
}

export interface BazarItem {
  id: string;
  name: string;
  cost: number;
}

export interface DailyEntry {
  id: string;
  date: string;
  units: Record<UnitName, UnitEntry>;
  bazarItems: BazarItem[];
  bazarCosts: number;
  totalIncome: number;
  totalVehicleCost: number;
  availableBalance: number;
  // Versioning properties
  parentId?: string;
  isHistory?: boolean;
  updatedAt: number;
}

export interface AuthUser {
  email: string;
  id: string;
  syncToken?: string;
}

export interface AppState {
  entries: DailyEntry[];
  user: AuthUser;
  registeredUsers: Record<string, string>;
}

export const UNIT_NAMES: UnitName[] = [
  "Car",
  "Ris - Sharif-1",
  "Ris - Sharif-2",
  "Auto",
  "Ris - Roman-1",
  "Ris - Roman-2"
];

export type ActiveTab = 'dashboard' | 'entry' | 'history';