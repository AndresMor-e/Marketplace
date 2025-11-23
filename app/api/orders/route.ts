import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const body = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { direccion_id, carrito, total } = body;

  const { data, error } = await supabase
    .from("ordenes")
    .insert({
      usuario_id: user.id,
      direccion_id,
      total,
      estado: "pendiente",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Error al crear la orden" }, { status: 400 });
  }

  return NextResponse.json({ orden: data });
}