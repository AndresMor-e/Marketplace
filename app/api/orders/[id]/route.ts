import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: any) {
  const supabase = await createServerSupabaseClient();
  const { id } = params;

  const { data, error } = await supabase
    .from("ordenes")
    .select("*, direcciones(*), usuarios(*)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  return NextResponse.json(data);
}