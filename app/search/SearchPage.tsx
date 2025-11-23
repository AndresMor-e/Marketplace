"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Navbar from '@/components/navbar'; // Ajusta la ruta según donde tengas tu Navbar

interface Producto {
  id: string;
  titulo: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  stock: number;
  estado: string;
  calificacion_promedio?: number;
  total_calificaciones?: number;
}

interface ProductoConCalificaciones extends Producto {
  calificacion_promedio: number;
  total_calificaciones: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<ProductoConCalificaciones[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setTotalResults(0);
      return;
    }

    async function fetchResults() {
      setLoading(true);
      try {
        const supabase = createClient();
        
        // Primero obtenemos el total de resultados
        const { count, error: countError } = await supabase
          .from('productos')
          .select('*', { count: 'exact', head: true })
          .ilike('titulo', `%${query}%`)
          .eq('estado', 'activo');

        if (countError) {
          console.error("Error al contar productos:", countError);
        } else {
          setTotalResults(count || 0);
        }

        // Obtenemos los productos
        const { data: productos, error: productosError } = await supabase
          .from('productos')
          .select('*')
          .ilike('titulo', `%${query}%`)
          .eq('estado', 'activo')
          .limit(20);

        if (productosError) {
          console.error("Error al buscar productos:", productosError);
          return;
        }

        if (!productos) {
          setResults([]);
          return;
        }

        // Para cada producto, obtenemos sus calificaciones
        const productosConCalificaciones = await Promise.all(
          productos.map(async (producto) => {
            // Obtenemos las reviews del producto
            const { data: reviews, error: reviewsError } = await supabase
              .from('reviews')
              .select('calificacion')
              .eq('producto_id', producto.id);

            let calificacion_promedio = 0;
            let total_calificaciones = 0;

            if (!reviewsError && reviews && reviews.length > 0) {
              total_calificaciones = reviews.length;
              const sumaCalificaciones = reviews.reduce((sum, review) => sum + (review.calificacion || 0), 0);
              calificacion_promedio = sumaCalificaciones / total_calificaciones;
            }

            return {
              ...producto,
              calificacion_promedio: Number(calificacion_promedio.toFixed(1)),
              total_calificaciones
            };
          })
        );

        setResults(productosConCalificaciones);
      } catch (error) {
        console.error("Error en la búsqueda:", error);
      } finally {
        setLoading(false);
      }
    }

    const timeoutId = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Función para renderizar estrellas
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${
              star <= Math.floor(rating)
                ? 'text-yellow-400'
                : star === Math.ceil(rating) && rating % 1 >= 0.5
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
        <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Función para formatear números (1.5K, 2.3K, etc.)
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar />
      
      {/* Contenido de la página de búsqueda */}
      <div className="p-4 max-w-6xl mx-auto">
        {/* Contador de resultados */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            {totalResults > 0 ? (
              <>
                <span className="font-semibold">{totalResults.toLocaleString()}</span> resultados para "{query}"
              </>
            ) : query ? (
              `No se encontraron resultados para "${query}"`
            ) : (
              "Ingresa un término de búsqueda"
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-gray-500">Buscando productos...</p>
          </div>
        ) : results.length === 0 && query ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">
              No se encontraron productos que coincidan con "{query}"
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Intenta con otros términos de búsqueda
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {results.map((producto) => (
              <Link 
                key={producto.id} 
                href={`/product/${producto.id}`}
                className="block p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white hover:bg-gray-50"
              >
                <div className="flex items-start gap-6">
                  {/* Imagen del producto */}
                  {producto.imagen_url ? (
                    <img 
                      src={producto.imagen_url} 
                      alt={producto.titulo}
                      className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-400 text-sm">Sin imagen</span>
                    </div>
                  )}
                  
                  {/* Información del producto */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xl mb-2 text-gray-900 hover:text-blue-600 transition-colors">
                      {producto.titulo}
                    </h3>
                    
                    {/* Calificación y opiniones */}
                    <div className="flex items-center gap-4 mb-3">
                      {producto.total_calificaciones > 0 ? (
                        <>
                          {renderStars(producto.calificacion_promedio)}
                          <span className="text-sm text-gray-600">
                            ({formatNumber(producto.total_calificaciones)} opiniones)
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">Sin calificaciones</span>
                      )}
                    </div>

                    {/* Precio y stock */}
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-green-600 text-2xl">
                        ${producto.precio}
                      </span>
                      <span className={`text-sm px-3 py-1 rounded-full ${
                        producto.stock > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {producto.stock > 0 ? 'En stock' : 'Sin stock'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}