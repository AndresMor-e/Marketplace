import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();

  const cuerpo = await req.json();
  const { titulo, descripcion, precio, stock, categoria_id, imagen_url } = cuerpo;

  // 1. Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // 2. Buscar el vendedor asignado al usuario
  const { data: vendedor, error: vendedorError } = await supabase
    .from("vendedores")
    .select("id")
    .eq("usuario_id", user.id)
    .single();

  if (vendedorError || !vendedor) {
    return NextResponse.json(
      { error: "No se encontró el vendedor" },
      { status: 400 }
    );
  }

  // 3. Crear el producto con el vendedor_id obligatorio
  const { error: insertError } = await supabase.from("productos").insert([
    {
      titulo,
      descripcion,
      precio,
      stock,
      categoria_id,
      imagen_url,
      vendedor_id: vendedor.id, // 👈 IMPORTANTE
    },
  ]);

  if (insertError) {
    return NextResponse.json(
      { error: `Error al crear producto: ${insertError.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ mensaje: "Producto creado con éxito" }, { status: 201 });
}
