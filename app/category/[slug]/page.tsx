"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Producto {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
  imagen_url: string | null;
  stock: number;
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaNombre, setCategoriaNombre] = useState("");
  const [loading, setLoading] = useState(true);

  // Filtros
  const [orden, setOrden] = useState("");
  const [precioFiltro, setPrecioFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      // Buscar la categoría
      const { data: categoria } = await supabase
        .from("categorias")
        .select("*")
        .eq("nombre", decodeURIComponent(slug))
        .single();

      if (!categoria) {
        setLoading(false);
        return;
      }

      setCategoriaNombre(categoria.nombre);

      let query = supabase
        .from("productos")
        .select("*")
        .eq("categoria_id", categoria.id)
        .eq("estado", "activo");

      // Filtro por orden
      if (orden === "mayor") query = query.order("precio", { ascending: false });
      if (orden === "menor") query = query.order("precio", { ascending: true });

      // Filtro por precios
      if (precioFiltro === "0-50") query = query.lte("precio", 50000);
      if (precioFiltro === "50-150") query = query.gte("precio", 50000).lte("precio", 150000);
      if (precioFiltro === "150+") query = query.gte("precio", 150000);

      // Búsqueda
      if (busqueda.trim() !== "")
        query = query.ilike("titulo", `%${busqueda}%`);

      const { data, error } = await query;

      if (!error && data) setProductos(data);
      setLoading(false);
    };

    fetchCategoryProducts();
  }, [slug, orden, precioFiltro, busqueda]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">
          {categoriaNombre || "Categoría"}
        </h1>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <select
            className="border rounded-lg px-3 py-2 bg-white text-sm shadow-sm"
            onChange={(e) => setOrden(e.target.value)}
          >
            <option value="">Ordenar</option>
            <option value="mayor">Precio: Mayor a menor</option>
            <option value="menor">Precio: Menor a mayor</option>
          </select>

          <select
            className="border rounded-lg px-3 py-2 bg-white text-sm shadow-sm"
            onChange={(e) => setPrecioFiltro(e.target.value)}
          >
            <option value="">Filtrar por precio</option>
            <option value="0-50">Menos de $50.000</option>
            <option value="50-150">$50.000 - $150.000</option>
            <option value="150+">Más de $150.000</option>
          </select>

          <input
            type="text"
            className="border rounded-lg px-3 py-2 bg-white text-sm shadow-sm"
            placeholder="Buscar producto..."
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Productos */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Aún no hay productos en esta categoría...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {productos.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`}>
                <div className="bg-white rounded-lg shadow hover:shadow-xl transition overflow-hidden cursor-pointer">
                  <div className="relative w-full h-48 bg-gray-200">
                    <Image
                      src={p.imagen_url || "/placeholder.svg"}
                      alt={p.titulo}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {p.titulo}
                    </h3>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xl font-bold text-gray-900">
                        ${p.precio.toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}