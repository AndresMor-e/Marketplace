import { NextResponse, NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Función para manejar las solicitudes GET en la ruta dinámica [id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { id: productId } = await params;

  // Realizar la consulta para obtener el producto con el id proporcionado
  const { data, error } = await supabase
    .from("productos")
    .select(`
      id,
      titulo,
      descripcion,
      precio,
      imagen_url,
      stock,
      estado,
      creado_en,
      categoria:categoria_id (
        id,
        nombre,
        descripcion
      ),
      vendedor:vendedor_id (
        id,
        nombre,
        correo,
        avatar_url
      ),
      reviews:reviews (
        id,
        calificacion,
        comentario,
        creado_en,
        usuario:usuario_id (
          id,
          nombre,
          correo,
          avatar_url
        )
      )
    `)
    .eq("id", productId)
    .single();  // Usamos single() porque esperamos un solo producto

  // Si hay un error o no se encuentra el producto, retornamos un error 404
  if (error || !data) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  // De lo contrario, retornamos los datos del producto
  return NextResponse.json(data);
}
