import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isMockMode, supabase } from "@/lib/supabase";
import { getMockConduces, saveMockConduce } from "@/lib/mockDb";
import { getTodayDateStr } from "@/lib/tz-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (isMockMode()) {
      const data = await getMockConduces();
      return NextResponse.json({ success: true, data });
    }

    // Consultar Supabase (tabla warranty_conduces)
    const { data, error } = await supabase
      .from("warranty_conduces")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al consultar conduces en Supabase:", error);
      // Fallback a local db si no existe la tabla
      console.warn("Intentando leer de base local como respaldo...");
      const localData = await getMockConduces();
      return NextResponse.json({ success: true, data: localData, warning: "Fallback to local" });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Error en API GET /api/conduces:", error);
    return NextResponse.json(
      { error: "Error interno en el servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const role = cookies().get("yacelltech_role")?.value;
  if (role === "tecnico") {
    return NextResponse.json(
      { error: "El rol técnico no tiene permisos para crear conduces." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { client_name, case_codes, is_supplier, is_tech } = body;

    if (!client_name || !case_codes || !Array.isArray(case_codes) || case_codes.length === 0) {
      return NextResponse.json(
        { error: "Los campos client_name y case_codes (array) son requeridos." },
        { status: 400 }
      );
    }

    const todayStr = getTodayDateStr(); // YYYY-MM-DD en hora dominicana

    // 1. Modo Local
    if (isMockMode()) {
      const record = await saveMockConduce({
        client_name,
        delivery_date: todayStr,
        case_codes,
        is_supplier: !!is_supplier,
        is_tech: !!is_tech,
      });
      return NextResponse.json({ success: true, data: record });
    }

    // 2. Modo Real con Supabase
    // Generamos el ID de Conduce localmente para consistencia y lo guardamos localmente
    const localRecord = await saveMockConduce({
      client_name,
      delivery_date: todayStr,
      case_codes,
      is_supplier: !!is_supplier,
      is_tech: !!is_tech,
    });

    const { data, error } = await supabase
      .from("warranty_conduces")
      .insert({
        id: localRecord.id,
        client_name,
        delivery_date: todayStr,
        case_codes,
        created_at: localRecord.created_at,
      })
      .select();

    if (error) {
      console.error("Error al insertar conduce en Supabase:", error);
      // Retornar exitoso de todas formas porque se guardó localmente como respaldo
      return NextResponse.json({ 
        success: true, 
        data: localRecord, 
        warning: "Guardado localmente. Supabase falló: " + error.message 
      });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error("Error en API POST /api/conduces:", error);
    return NextResponse.json(
      { error: "Error interno en el servidor" },
      { status: 500 }
    );
  }
}
