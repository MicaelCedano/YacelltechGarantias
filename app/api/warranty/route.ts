import { NextResponse } from "next/server";
import { isMockMode, supabase } from "@/lib/supabase";
import { getMockCases } from "@/lib/mockDb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Si estamos en modo de prueba local sin credenciales
    if (isMockMode()) {
      const data = await getMockCases();
      return NextResponse.json({ success: true, data });
    }

    // De lo contrario, consultar Supabase
    const { data, error } = await supabase
      .from("warranty_cases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error consultando Supabase:", error);
      return NextResponse.json(
        { error: "Error en la consulta de base de datos" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Error en API GET /api/warranty:", error);
    return NextResponse.json(
      { error: "Error interno en el servidor" },
      { status: 500 }
    );
  }
}
