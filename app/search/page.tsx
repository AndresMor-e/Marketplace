"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import Image from "next/image";
import Link from "next/link";

interface Product {
  id: string;
  titulo: string;
  precio: number;
  imagen_url: string;
  vendedor: {
    nombre: string;
  } | null;
  rating: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const searchProducts = async () => {
      if (!query.trim()) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("productos")
        .select(`
          id,
          titulo,
          precio,
          imagen_url,
          vendedor:vendedor_id(nombre),
          reviews:reviews(calificacion)
        `)
        .ilike("titulo", `%${query}%`);

      if (!error && data) {
        const formatted = data.map((product: any) => ({
          ...product,
          rating:
            product.reviews?.length > 0
              ? product.reviews.reduce((a: number, r: any) => a + r.calificacion, 0) /
                product.reviews.length
              : 0,
        }));

        setProducts(formatted);
      }

      setLoading(false);
    };

    searchProducts();
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">Buscar productos</h1>
        <p className="text-gray-600 mb-8">
          {query && `Results for "${query}"`}
        </p>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Buscando...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No se han encontrado productos que coincidan con su búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <div className="bg-white rounded-lg shadow hover:shadow-xl transition overflow-hidden cursor-pointer">
                  <div className="relative w-full h-48 bg-gray-200">
                    <Image
                      src={product.imagen_url || "/placeholder.svg"}
                      alt={product.titulo}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {product.titulo}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {product.vendedor?.nombre || "Vendedor desconocido"}
                    </p>

                    <span className="text-xl font-bold text-gray-900">
                      ${product.precio.toFixed(2)}
                    </span>

                    <div className="flex items-center mt-2 text-yellow-500">
                      {product.rating > 0 && (
                        <>
                          <span>★</span>
                          <span className="text-sm ml-1">
                            {product.rating.toFixed(1)}
                          </span>
                        </>
                      )}
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
