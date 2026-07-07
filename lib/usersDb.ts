import fs from "fs";
import path from "path";
import { nowSDISO } from "./tz-utils";

/**
 * Roles permitidos en el sistema.
 * - admin: control total (incluye borrar / cambiar rol de otros usuarios)
 * - soporte: técnico especializado (puede crear usuarios, no borrar ni cambiar rol)
 * - taller: encargado de taller (puede crear usuarios, no borrar ni cambiar rol)
 */
export type UserRole = "admin" | "soporte" | "taller";

export const USER_ROLES: UserRole[] = ["admin", "soporte", "taller"];

export interface AppUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

const DB_PATH = path.join(process.cwd(), "users_db.json");

function readDb(): AppUser[] {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const content = fs.readFileSync(DB_PATH, "utf-8");
    if (!content.trim()) return [];
    return JSON.parse(content);
  } catch (error) {
    console.error("Error de lectura en users_db.json:", error);
    return [];
  }
}

function writeDb(data: AppUser[]) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error de escritura en users_db.json:", error);
  }
}

export async function getMockUsers(): Promise<AppUser[]> {
  return readDb();
}

export async function getMockUserByEmail(email: string): Promise<AppUser | null> {
  const users = readDb();
  const normalized = email.trim().toLowerCase();
  const found = users.find(
    (u) =>
      u.email.toLowerCase() === normalized ||
      u.email.split("@")[0].toLowerCase() === normalized
  );
  return found || null;
}

export async function saveMockUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}): Promise<AppUser> {
  const users = readDb();
  const timestamp = nowSDISO();
  const newUser: AppUser = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    name: input.name.trim(),
    role: input.role,
    created_at: timestamp,
    updated_at: timestamp,
  };
  users.unshift(newUser);
  writeDb(users);
  return newUser;
}

export async function deleteMockUser(id: string): Promise<boolean> {
  const users = readDb();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  writeDb(users);
  return true;
}

export async function updateMockUserRole(id: string, role: UserRole): Promise<AppUser | null> {
  const users = readDb();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = {
    ...users[idx],
    role,
    updated_at: nowSDISO(),
  };
  writeDb(users);
  return users[idx];
}
