import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isMockMode } from "@/lib/supabase";
import { getMockUsers, USER_ROLES } from "@/lib/usersDb";

export const dynamic = "force-dynamic";

/**
 * GET /api/users
 * Devuelve la lista de usuarios (sin password).
 * Gate: solo accesible si hay un rol válido en la cookie.
 */
export async function GET() {
  try {
    const roleCookie = cookies().get("yacelltech_role")?.value;
    if (!roleCookie || !(USER_ROLES as string[]).includes(roleCookie)) {
      return NextResponse.json(
        { success: false, error: "Acceso no autorizado." },
        { status: 403 }
      );
    }

    if (isMockMode()) {
      const users = await getMockUsers();
      // Strip password defensively: build a fresh object instead of destructuring
      // (destructuring the password name triggers @typescript-eslint/no-unused-vars).
      const safe = users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        status: u.status,
        created_at: u.created_at,
        updated_at: u.updated_at,
      }));
      return NextResponse.json({ success: true, users: safe });
    }

    // Modo Supabase (futuro): devolver desde tabla `app_users` cuando exista.
    return NextResponse.json(
      {
        success: false,
        error:
          "Listado de usuarios en Supabase aún no implementado. Configure MOCK_MODE o agregue la tabla app_users.",
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error en GET /api/users:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al listar usuarios." },
      { status: 500 }
    );
  }
}
