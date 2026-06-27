"use server";

import { isMockMode, supabase } from "@/lib/supabase";
import { generateCaseCode } from "@/lib/generateCaseCode";
import { cookies } from "next/headers";
import { 
  saveMockCase, 
  generateMockCaseCode
} from "@/lib/mockDb";

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
 * Autentica al usuario (con soporte para el usuario local admin@yacelltech.com / admin).
 */
export async function loginUser(email: string, password: string) {
  try {
    if (!email.trim() || !password.trim()) {
      return { success: false, error: "El usuario y la contraseña son obligatorios." };
    }
    // 1. AUTENTICACIÓN EN MODO LOCAL SIMULADO
    if (isMockMode()) {
      const MOCK_USERS = [
        { email: "admin@yacelltech.com", password: "MOCK_PASSWORD_SET_IN_ENV", name: "Administrador" },
        { email: "soporte@yacelltech.com", password: "MOCK_PASSWORD_SET_IN_ENV", name: "Soporte Técnico" },
        { email: "tecnico@yacelltech.com", password: "MOCK_PASSWORD_SET_IN_ENV", name: "Técnico Especializado" },
        { email: "taller@yacelltech.com", password: "MOCK_PASSWORD_SET_IN_ENV", name: "Encargado de Taller" },
        { email: "alejandro@yacelltech.com", password: "MOCK_PASSWORD_SET_IN_ENV", name: "Alejandro" },
      ];

      const foundUser = MOCK_USERS.find(
        (u) => 
          (u.email.toLowerCase() === email.toLowerCase() || 
           u.email.split("@")[0].toLowerCase() === email.toLowerCase()) && 
          u.password === password
      );

      if (foundUser) {
        // Generar una cookie de sesión simulada (por 1 año para mantenerla abierta)
        cookies().set("yacelltech_token", "mock-session-token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 365 * 24 * 60 * 60, // 1 año
          path: "/",
          sameSite: "lax",
        });
        return { success: true };
      } else {
        return { 
          success: false, 
          error: "Credenciales de prueba incorrectas. Pruebe con: admin o soporte." 
        };
      }
    }

    // 2. AUTENTICACIÓN EN MODO REAL CON SUPABASE
    const finalEmail = email.includes("@") ? email.trim() : `${email.trim()}@yacelltech.com`;
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
