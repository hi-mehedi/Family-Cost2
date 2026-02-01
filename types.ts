export type UnitName = "Car" | "Ris-new1" | "Ris-Roman1" | "Ris-Roman2" | "Ris-2" | "Auto";

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
  "Ris-new1",
  "Ris-Roman1",
  "Ris-Roman2",
  "Ris-2",
  "Auto"
];

export type ActiveTab = 'dashboard' | 'entry' | 'history';