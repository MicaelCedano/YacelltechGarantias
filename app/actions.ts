"use server";

import { isMockMode, supabase } from "@/lib/supabase";
import { generateCaseCode } from "@/lib/generateCaseCode";
import { cookies } from "next/headers";
import {
  saveMockCase,
  generateMockCaseCode,
} from "@/lib/mockDb";
import {
  USER_ROLES,
  UserRole,
  USER_STATUSES,
  UserStatus,
  saveMockUser,
  deleteMockUser,
  updateMockUserRole,
  updateMockUserStatus,
  getMockUserByUsername,
} from "@/lib/usersDb";

interface WarrantyIntakeInput {
  imei: string;
  model: string;
  client_name: string;
  problem: string;
  entry_date: string;
  status: string;
}

export async function createWarrantyCase(formData: WarrantyIntakeInput) {
  try {
    // Validaciones básicas de servidor
    if (!formData.imei || formData.imei.length !== 15 || !/^\d+$/.test(formData.imei)) {
      return { success: false, error: "El IMEI debe tener exactamente 15 dígitos numéricos." };
    }
    if (!formData.model.trim()) {
      return { success: false, error: "El modelo del dispositivo es obligatorio." };
    }
    if (!formData.client_name.trim()) {
      return { success: false, error: "El nombre del cliente es obligatorio." };
    }
    if (!formData.problem.trim()) {
      return { success: false, error: "La descripción del problema es obligatoria." };
    }
    if (!formData.entry_date) {
      return { success: false, error: "La fecha de entrada es obligatoria." };
    }

    // 1. DESVÍO A MODO LOCAL SIMULADO
    if (isMockMode()) {
      const case_code = await generateMockCaseCode(formData.entry_date);
      const mockCase = await saveMockCase({
        imei: formData.imei,
        model: formData.model.trim(),
        client_name: formData.client_name.trim(),
        problem: formData.problem.trim(),
        entry_date: formData.entry_date,
        status: formData.status,
        case_code,
      });

      return {
        success: true,
        case_code,
        case: mockCase,
      };
    }

    // 2. MODO REAL: MIGRADO A SUPABASE
    const case_code = await generateCaseCode(formData.entry_date);

    const { data, error } = await supabase
      .from("warranty_cases")
      .insert([
        {
          case_code,
          imei: formData.imei,
          model: formData.model.trim(),
          client_name: formData.client_name.trim(),
          problem: formData.problem.trim(),
          entry_date: formData.entry_date,
          status: formData.status,
        },
      ])
      .select();

    if (error) {
      console.error("Error de Supabase en insert:", error);
      return { success: false, error: "No se pudo guardar la garantía en la base de datos." };
    }

    return {
      success: true,
      case_code,
      case: data[0],
    };
  } catch (error) {
    console.error("Error en Server Action createWarrantyCase:", error);
    const message = error instanceof Error ? error.message : "Error interno de servidor";
    return { success: false, error: message };
  }
}

/**
 * Autentica al usuario por nombre de usuario + contraseña (mock mode).
 * Los 5 usuarios base se siembran automáticamente la primera vez.
 */
export async function loginUser(username: string, password: string) {
  try {
    if (!username.trim() || !password.trim()) {
      return { success: false, error: "El usuario y la contraseña son obligatorios." };
    }
    // 1. AUTENTICACIÓN EN MODO LOCAL SIMULADO
    if (isMockMode()) {
      // Semilla inicial: si users_db.json está vacío, sembrar los 5 usuarios base.
      // Las contraseñas en mock mode son placeholders; ver audit 2026-06-27.
      const { getMockUsers } = await import("@/lib/usersDb");
      let users = await getMockUsers();
      if (users.length === 0) {
        const seed = [
          { username: "admin", password: "MOCK_PASSWORD_SET_IN_ENV", name: "Administrador", role: "admin" as const },
          { username: "soporte", password: "MOCK_PASSWORD_SET_IN_ENV", name: "Soporte Técnico", role: "soporte" as const },
          { username: "tecnico", password: "MOCK_PASSWORD_SET_IN_ENV", name: "Técnico Especializado", role: "soporte" as const },
          { username: "taller", password: "MOCK_PASSWORD_SET_IN_ENV", name: "Encargado de Taller", role: "taller" as const },
          { username: "alejandro", password: "MOCK_PASSWORD_SET_IN_ENV", name: "Alejandro", role: "taller" as const },
        ];
        for (const u of seed) {
          await saveMockUser(u);
        }
        users = await getMockUsers();
      }

      const foundUser = users.find(
        (u) =>
          u.username.toLowerCase() === username.toLowerCase() &&
          u.password === password
      );

      if (!foundUser) {
        return {
          success: false,
          error: "Credenciales incorrectas. Verifique su usuario y contraseña."
        };
      }

      // Bloquear cuentas pendientes: si la cuenta existe pero el admin aún no
      // la aprobó, mostrar mensaje específico para que el usuario sepa que
      // tiene que esperar.
      if (foundUser.status !== "activo") {
        return {
          success: false,
          error: "Tu solicitud de cuenta está pendiente de aprobación por el administrador. Te avisaremos cuando esté activa.",
        };
      }

      // Generar una cookie de sesión simulada (por 1 año para mantenerla abierta)
      cookies().set("yacelltech_token", "mock-session-token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60, // 1 año
        path: "/",
        sameSite: "lax",
      });
      // Cookie legible en cliente con el rol, para gating de UI.
      cookies().set("yacelltech_role", foundUser.role, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60,
        path: "/",
        sameSite: "lax",
      });
      cookies().set("yacelltech_user", foundUser.name, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60,
        path: "/",
        sameSite: "lax",
      });
      return { success: true, role: foundUser.role };
    }

    // 2. AUTENTICACIÓN EN MODO REAL CON SUPABASE
    // Mapeo: en Supabase el email se construye como username@yacelltech.com para
    // mantener compatibilidad con la estructura anterior.
    const finalEmail = `${username.trim().toLowerCase()}@yacelltech.com`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password,
    });

    if (error) {
      console.error("Error en signInWithPassword:", error);
      let userFriendlyError = error.message;
      if (error.message.includes("Invalid login credentials") || error.message.includes("invalid claim")) {
        userFriendlyError = "Credenciales incorrectas. Verifique su usuario y contraseña.";
      }
      return { success: false, error: userFriendlyError };
    }

    if (data.session) {
      cookies().set("yacelltech_token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60, // 1 año (para mantener la sesión abierta)
        path: "/",
        sameSite: "lax",
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error en Server Action loginUser:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

/**
 * Cierra la sesión borrando la cookie y avisando a Supabase si aplica.
 */
export async function logoutUser() {
  try {
    cookies().delete("yacelltech_token");
    cookies().delete("yacelltech_role");
    cookies().delete("yacelltech_user");

    // Si no estamos en modo simulado, desautenticar en Supabase
    if (!isMockMode()) {
      await supabase.auth.signOut();
    }

    return { success: true };
  } catch (error) {
    console.error("Error en Server Action logoutUser:", error);
    return { success: false, error: "Ocurrió un error al cerrar la sesión." };
  }
}

/**
 * Lee la cookie de rol del request actual.
 * Devuelve null si no hay sesión o si la cookie no es uno de los roles válidos.
 * Se usa para gating de UI y server actions del módulo de usuarios.
 */
export async function getCurrentRole(): Promise<UserRole | null> {
  const role = cookies().get("yacelltech_role")?.value;
  if (role && (USER_ROLES as string[]).includes(role)) {
    return role as UserRole;
  }
  return null;
}

/**
 * Crear un usuario nuevo.
 * Permitido a: admin, soporte, taller (cualquiera logueado con rol alto).
 * Persistencia mock-only por ahora (mismo patrón que el resto de la app).
 */
/**
 * Crear un usuario directo, sin aprobación (atajo del admin).
 * Permitido SOLO a: admin.
 * Para que un usuario nuevo entre por su cuenta, debe usar `registerUser` y
 * luego el admin lo aprueba con `approveUser`.
 */
export async function createUser(input: {
  username: string;
  password: string;
  name: string;
  role: UserRole;
}) {
  try {
    // Gate: SOLO admin puede crear cuentas directas (sin aprobación)
    const currentRole = await getCurrentRole();
    if (currentRole !== "admin") {
      return { success: false, error: "Solo el administrador puede crear cuentas de forma directa. Los demás usuarios deben solicitar registro." };
    }

    // Validaciones de payload
    const username = input.username.trim().toLowerCase();
    const name = input.name.trim();
    const password = input.password;
    if (!username || username.length < 2) {
      return { success: false, error: "El nombre de usuario debe tener al menos 2 caracteres." };
    }
    if (!/^[a-z0-9._-]+$/.test(username)) {
      return { success: false, error: "El usuario solo puede contener letras minúsculas, números, punto, guion y guion bajo." };
    }
    if (!password || password.length < 3) {
      return { success: false, error: "La contraseña debe tener al menos 3 caracteres." };
    }
    if (!name) {
      return { success: false, error: "El nombre es obligatorio." };
    }
    if (!(USER_ROLES as string[]).includes(input.role)) {
      return { success: false, error: "Rol no válido." };
    }

    // Duplicado
    const existing = await getMockUserByUsername(username);
    if (existing) {
      return { success: false, error: "Ya existe un usuario con ese nombre." };
    }

    // Creación directa: ya entra como "activo"
    const created = await saveMockUser({ username, password, name, role: input.role, status: "activo" });
    return { success: true, user: { ...created, password: undefined } };
  } catch (error) {
    console.error("Error en createUser:", error);
    const message = error instanceof Error ? error.message : "Error interno al crear usuario";
    return { success: false, error: message };
  }
}

/**
 * Self-registration: un usuario nuevo se registra solo.
 * Sin gate: cualquiera puede pedir una cuenta. Queda con status "pendiente"
 * hasta que un admin la apruebe con `approveUser`.
 * El login está bloqueado mientras la cuenta esté pendiente.
 */
export async function registerUser(input: {
  username: string;
  password: string;
  name: string;
  role: UserRole;
}) {
  try {
    // Validaciones de payload
    const username = input.username.trim().toLowerCase();
    const name = input.name.trim();
    const password = input.password;
    if (!username || username.length < 2) {
      return { success: false, error: "El nombre de usuario debe tener al menos 2 caracteres." };
    }
    if (!/^[a-z0-9._-]+$/.test(username)) {
      return { success: false, error: "El usuario solo puede contener letras minúsculas, números, punto, guion y guion bajo." };
    }
    if (!password || password.length < 3) {
      return { success: false, error: "La contraseña debe tener al menos 3 caracteres." };
    }
    if (!name) {
      return { success: false, error: "El nombre es obligatorio." };
    }
    if (!(USER_ROLES as string[]).includes(input.role)) {
      return { success: false, error: "Rol no válido." };
    }

    // Duplicado: si el username ya existe (activo o pendiente), rechazar.
    const existing = await getMockUserByUsername(username);
    if (existing) {
      return {
        success: false,
        error: existing.status === "pendiente"
          ? "Ya existe una solicitud pendiente con ese nombre de usuario. Espera a que el administrador la revise."
          : "Ese nombre de usuario ya está registrado.",
      };
    }

    const created = await saveMockUser({ username, password, name, role: input.role, status: "pendiente" });
    return { success: true, user: { ...created, password: undefined } };
  } catch (error) {
    console.error("Error en registerUser:", error);
    const message = error instanceof Error ? error.message : "Error interno al registrar la solicitud";
    return { success: false, error: message };
  }
}

/**
 * Aprobar una solicitud pendiente: pasa la cuenta a "activo".
 * Permitido a: admin (puede asignar el rol final, opcionalmente distinto al pedido).
 */
export async function approveUser(userId: string, finalRole?: UserRole) {
  try {
    const currentRole = await getCurrentRole();
    if (currentRole !== "admin") {
      return { success: false, error: "Solo el administrador puede aprobar solicitudes." };
    }
    if (!userId) {
      return { success: false, error: "ID de usuario requerido." };
    }

    // Si pasan finalRole, primero actualizo el rol y después el status.
    if (finalRole && (USER_ROLES as string[]).includes(finalRole)) {
      await updateMockUserRole(userId, finalRole);
    }
    const updated = await updateMockUserStatus(userId, "activo");
    return updated
      ? { success: true, user: { ...updated, password: undefined } }
      : { success: false, error: "No se pudo aprobar la solicitud." };
  } catch (error) {
    console.error("Error en approveUser:", error);
    const message = error instanceof Error ? error.message : "Error interno al aprobar la solicitud";
    return { success: false, error: message };
  }
}

/**
 * Rechazar una solicitud pendiente: borra la cuenta.
 * Permitido a: admin.
 */
export async function rejectUser(userId: string) {
  try {
    const currentRole = await getCurrentRole();
    if (currentRole !== "admin") {
      return { success: false, error: "Solo el administrador puede rechazar solicitudes." };
    }
    if (!userId) {
      return { success: false, error: "ID de usuario requerido." };
    }
    const ok = await deleteMockUser(userId);
    return ok
      ? { success: true }
      : { success: false, error: "No se pudo rechazar la solicitud." };
  } catch (error) {
    console.error("Error en rejectUser:", error);
    const message = error instanceof Error ? error.message : "Error interno al rechazar la solicitud";
    return { success: false, error: message };
  }
}

/**
 * Cuenta cuántas solicitudes están pendientes de aprobación.
 * Se usa para mostrar el badge 🔔 en el header.
 * Sin gate: es un número inocuo. Si hubiera info sensible, gatear.
 */
export async function countPendingUsers(): Promise<number> {
  try {
    const { getMockUsers } = await import("@/lib/usersDb");
    const users = await getMockUsers();
    return users.filter((u) => u.status === "pendiente").length;
  } catch (error) {
    console.error("Error en countPendingUsers:", error);
    return 0;
  }
}

/**
 * Eliminar un usuario por id.
 * Permitido SOLO a: admin.
 */
export async function removeUser(userId: string) {
  try {
    const currentRole = await getCurrentRole();
    if (currentRole !== "admin") {
      return { success: false, error: "Solo el administrador puede eliminar usuarios." };
    }
    if (!userId) {
      return { success: false, error: "ID de usuario requerido." };
    }

    // Protección: no permitir que el admin se borre a sí mismo. El chequeo
    // mínimo viable es: si está borrando a un admin, asegurarse de que no quede 0.
    const { getMockUsers } = await import("@/lib/usersDb");
    const all = await getMockUsers();
    const target = all.find((u) => u.id === userId);
    if (!target) {
      return { success: false, error: "Usuario no encontrado." };
    }
    const adminCount = all.filter((u) => u.role === "admin").length;
    if (target.role === "admin" && adminCount <= 1) {
      return {
        success: false,
        error: "No se puede eliminar al último administrador del sistema.",
      };
    }

    const ok = await deleteMockUser(userId);
    return ok
      ? { success: true }
      : { success: false, error: "No se pudo eliminar el usuario." };
  } catch (error) {
    console.error("Error en removeUser:", error);
    const message = error instanceof Error ? error.message : "Error interno al eliminar usuario";
    return { success: false, error: message };
  }
}

/**
 * Cambiar el rol de un usuario.
 * Permitido SOLO a: admin.
 */
export async function changeUserRole(userId: string, newRole: UserRole) {
  try {
    const currentRole = await getCurrentRole();
    if (currentRole !== "admin") {
      return { success: false, error: "Solo el administrador puede cambiar roles." };
    }
    if (!userId) {
      return { success: false, error: "ID de usuario requerido." };
    }
    if (!(USER_ROLES as string[]).includes(newRole)) {
      return { success: false, error: "Rol no válido." };
    }

    // Si está degradando a un admin, no permitir que quede 0 admin
    const { getMockUsers } = await import("@/lib/usersDb");
    const all = await getMockUsers();
    const target = all.find((u) => u.id === userId);
    if (!target) {
      return { success: false, error: "Usuario no encontrado." };
    }
    if (target.role === "admin" && newRole !== "admin") {
      const adminCount = all.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        return {
          success: false,
          error: "No se puede degradar al último administrador del sistema.",
        };
      }
    }

    const updated = await updateMockUserRole(userId, newRole);
    return updated
      ? { success: true, user: { ...updated, password: undefined } }
      : { success: false, error: "No se pudo actualizar el rol." };
  } catch (error) {
    console.error("Error en changeUserRole:", error);
    const message = error instanceof Error ? error.message : "Error interno al cambiar rol";
    return { success: false, error: message };
  }
}

interface IntakeItem {
  imei: string;
  model: string;
  problem: string;
}

interface IntakeInput {
  client_name: string;
  entry_date: string;
  status: string;
  devices: IntakeItem[];
}

export async function createWarrantyCases(formData: IntakeInput) {
  try {
    const { client_name, entry_date, status, devices } = formData;

    if (!client_name.trim()) {
      return { success: false, error: "El nombre del cliente es obligatorio." };
    }
    if (!entry_date) {
      return { success: false, error: "La fecha de entrada es obligatoria." };
    }
    if (!devices || devices.length === 0) {
      return { success: false, error: "Debe ingresar al menos un dispositivo." };
    }

    const createdCases = [];
    const caseCodes = [];

    // Procesamiento secuencial para garantizar códigos correlativos consecutivos correctos sin condiciones de carrera en base de datos
    for (const dev of devices) {
      if (!dev.imei || dev.imei.length !== 15 || !/^\d+$/.test(dev.imei)) {
        return { success: false, error: `El IMEI ${dev.imei || ""} debe tener exactamente 15 dígitos numéricos.` };
      }
      if (!dev.model.trim()) {
        return { success: false, error: "El modelo del dispositivo es obligatorio." };
      }
      if (!dev.problem.trim()) {
        return { success: false, error: "La descripción del fallo es obligatoria." };
      }

      if (isMockMode()) {
        const case_code = await generateMockCaseCode(entry_date);
        const mockCase = await saveMockCase({
          imei: dev.imei,
          model: dev.model.trim(),
          client_name: client_name.trim(),
          problem: dev.problem.trim(),
          entry_date,
          status,
          case_code,
        });
        createdCases.push(mockCase);
        caseCodes.push(case_code);
      } else {
        const case_code = await generateCaseCode(entry_date);
        const { data, error } = await supabase
          .from("warranty_cases")
          .insert([
            {
              case_code,
              imei: dev.imei,
              model: dev.model.trim(),
              client_name: client_name.trim(),
              problem: dev.problem.trim(),
              entry_date,
              status,
            },
          ])
          .select();

        if (error) {
          console.error("Error de Supabase en insert:", error);
          return { success: false, error: `No se pudo registrar el equipo con IMEI ${dev.imei}.` };
        }
        createdCases.push(data[0]);
        caseCodes.push(case_code);
      }
    }

    return {
      success: true,
      case_codes: caseCodes,
      cases: createdCases,
    };
  } catch (error) {
    console.error("Error en Server Action createWarrantyCases:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}
