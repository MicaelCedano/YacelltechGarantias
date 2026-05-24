import { NextRequest, NextResponse } from "next/server";
import { isMockMode, supabase } from "@/lib/supabase";
import { updateMockCaseFields, deleteMockCase } from "@/lib/mockDb";

const VALID_STATUSES = ["En reparación", "Enviado al suplidor", "Recibido del suplidor", "Entregado"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { caseCode: string } }
) {
  const caseCode = params.caseCode;

  try {
    const body = await request.json();
    const { status, client_name, model, imei, problem } = body;

    // Validar estado si viene en la petición
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Estado inválido. Los estados permitidos son: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validar IMEI si viene en la petición
    if (imei && (imei.length !== 15 || !/^\d+$/.test(imei))) {
      return NextResponse.json(
        { error: "El IMEI debe contener exactamente 15 dígitos numéricos." },
        { status: 400 }
      );
    }

    // Construir el objeto de actualizaciones
    const updateFields: Record<string, string> = {};
    if (status !== undefined) updateFields.status = status;
    if (client_name !== undefined) updateFields.client_name = client_name.trim();
    if (model !== undefined) updateFields.model = model.trim();
    if (imei !== undefined) updateFields.imei = imei;
    if (problem !== undefined) updateFields.problem = problem.trim();

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron campos para actualizar." },
        { status: 400 }
      );
    }

    // 1. MODO LOCAL SIMULADO
    if (isMockMode()) {
      const updatedCase = await updateMockCaseFields(caseCode, updateFields);
      if (!updatedCase) {
        return NextResponse.json(
          { error: `No se encontró ningún caso local con el código ${caseCode}` },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Garantía actualizada con éxito localmente",
        case: updatedCase,
      });
    }

    // 2. MODO REAL CON SUPABASE
    const { data, error } = await supabase
      .from("warranty_cases")
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq("case_code", caseCode)
      .select();

    if (error) {
      console.error("Error de Supabase al actualizar:", error);
      return NextResponse.json(
        { error: "Error en la base de datos al actualizar el registro" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: `No se encontró ningún caso con el código ${caseCode}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Garantía actualizada con éxito",
      case: data[0],
    });
  } catch (error) {
    console.error("Error en API de actualización de garantía:", error);
    return NextResponse.json(
      { error: "Error interno en el servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { caseCode: string } }
) {
  const caseCode = params.caseCode;

  try {
    // 1. MODO LOCAL SIMULADO
    if (isMockMode()) {
      const deleted = await deleteMockCase(caseCode);
      if (!deleted) {
        return NextResponse.json(
          { error: `No se encontró ningún caso local con el código ${caseCode}` },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Garantía eliminada del almacenamiento local con éxito",
      });
    }

    // 2. MODO REAL CON SUPABASE
    const { error } = await supabase
      .from("warranty_cases")
      .delete()
      .eq("case_code", caseCode);

    if (error) {
      console.error("Error de Supabase al eliminar:", error);
      return NextResponse.json(
        { error: "Error en la base de datos al eliminar la garantía" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Garantía eliminada con éxito",
    });
  } catch (error) {
    console.error("Error en API de eliminación de garantía:", error);
    return NextResponse.json(
      { error: "Error interno en el servidor" },
      { status: 500 }
    );
  }
}
