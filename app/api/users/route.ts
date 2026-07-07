import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isMockMode, getSupabaseAdmin } from "@/lib/supabase";
import { getMockUsers, USER_ROLES } from "@/lib/usersDb";

export const dynamic = "force-dynamic";

/**
 * GET /api/users
 * Devuelve la lista de usuarios (sin password).
 * Gate: solo accesible si hay un rol válido en la cookie.
 * Modo: lee de `app_users` (Supabase) o `users_db.json` (mock).
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

    // Modo Supabase: query a app_users via service role.
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SUPABASE_SERVICE_ROLE_KEY no está configurada. Agregala en Vercel → Settings → Environment Variables.",
        },
        { status: 500 }
      );
    }

    const { data, error } = await admin
      .from("app_users")
      .select("id, username, name, role, status, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase error en GET /api/users:", error);
      return NextResponse.json(
        { success: false, error: `Error al listar usuarios: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, users: data || [] });
  } catch (error) {
    console.error("Error en GET /api/users:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al listar usuarios." },
      { status: 500 }
    );
  }
}
