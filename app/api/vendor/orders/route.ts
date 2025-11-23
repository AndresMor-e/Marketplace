// app/api/vendedor/orders/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const data = await request.json();
    const { usuario_id, productos, total } = data;

    if (!usuario_id || !Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json(
        { error: "Datos inválidos para crear la orden" },
        { status: 400 }
      );
    }

    // Crear orden principal
    const { data: orden, error: ordenError } = await supabase
      .from("ordenes")
      .insert({
        usuario_id,
        total,
        estado: "pendiente",
        creado_en: new Date().toISOString(),
      })
      .select()
      .single();

    if (ordenError) {
      return NextResponse.json(
        { error: "Error al crear la orden", detalles: ordenError },
        { status: 500 }
      );
    }

    // Insertar productos de la orden
    const orderProducts = productos.map((p: any) => ({
      orden_id: orden.id,
      producto_id: p.id,
      cantidad: p.cantidad ?? 1,
      precio_unitario: p.precio ?? 0,
    }));

    const { error: productosError } = await supabase
      .from("ordenes_productos")
      .insert(orderProducts);

    if (productosError) {
      return NextResponse.json(
        { error: "Error al guardar productos", detalles: productosError },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { mensaje: "Orden creada con éxito", orden_id: orden.id },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error inesperado", detalles: err.message },
      { status: 500 }
    );
  }
}



