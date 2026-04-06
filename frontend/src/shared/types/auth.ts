export type UserRole = "super_admin" | "admin" | "doctor" | "assistant_doctor" | "receptionist" | "assistant";

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  chamber_ids: string[];
  is_active: boolean;
}

export interface Chamber {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

export interface UserRecord {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  chamber_ids: string[];
  is_active: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  doctor: "Doctor",
  assistant_doctor: "Assistant Doctor",
  receptionist: "Receptionist",
  assistant: "Assistant",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "#be123c",
  admin: "#7c3aed",
  doctor: "#1d4ed8",
  assistant_doctor: "#0891b2",
  receptionist: "#059669",
  assistant: "#d97706",
};

export const ALL_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "doctor",
  "assistant_doctor",
  "receptionist",
  "assistant",
];
