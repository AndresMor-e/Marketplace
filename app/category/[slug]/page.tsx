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
  vendedor_id: string;
  vendedor_nombre?: string;
  calificacion_promedio?: number;
  total_reviews?: number;
  categoria_id?: string;
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoria, setCategoria] = useState<{id: string, nombre: string, descripcion?: string} | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [orden, setOrden] = useState("");
  const [precioFiltro, setPrecioFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const supabase = createClient();

  // Función para formatear el precio
  const formatPrice = (price: number | string) => {
    try {
      let priceNumber: number;
      
      if (typeof price === 'string') {
        const cleanString = price.toString().replace(/[^\d.,]/g, '');
        priceNumber = parseFloat(cleanString.replace(',', '.'));
      } else {
        priceNumber = price;
      }
      
      if (isNaN(priceNumber)) {
        return `$${price}`;
      }
      
      return `$${priceNumber.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
      
    } catch (error) {
      return `$${price}`;
    }
  };

  // Componente para mostrar estrellas
  const StarRating = ({ rating, totalReviews }: { rating?: number, totalReviews?: number }) => {
    if (!rating || rating === 0) {
      return (
        <div className="flex items-center gap-1 text-gray-400">
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span className="text-xs text-gray-500 ml-1">Sin reseñas</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <div className="flex text-yellow-400">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={star <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"}
            >
              ★
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-600 ml-1">
          {rating} {totalReviews && `(${totalReviews})`}
        </span>
      </div>
    );
  };

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      setLoading(true);
      
      try {
        // 1. Buscar la categoría por nombre desde la URL
        const categoriaNombre = decodeURIComponent(slug);
        const { data: categoriaData, error: categoriaError } = await supabase
          .from("categorias")
          .select("id, nombre, descripcion")
          .eq("nombre", categoriaNombre)
          .single();

        if (categoriaError || !categoriaData) {
          console.error("Categoría no encontrada:", categoriaError);
          setCategoria(null);
          setProductos([]);
          setLoading(false);
          return;
        }

        setCategoria(categoriaData);

        // 2. Buscar productos de esta categoría
        let query = supabase
          .from("productos")
          .select(`
            *,
            usuarios!inner(nombre)
          `)
          .eq("categoria_id", categoriaData.id)
          .eq("estado", "activo");

        // Aplicar filtros
        if (orden === "mayor") {
          query = query.order("precio", { ascending: false });
        } else if (orden === "menor") {
          query = query.order("precio", { ascending: true });
        } else {
          query = query.order("creado_en", { ascending: false });
        }

        if (precioFiltro === "0-50") {
          query = query.lte("precio", 50000);
        } else if (precioFiltro === "50-150") {
          query = query.gte("precio", 50000).lte("precio", 150000);
        } else if (precioFiltro === "150+") {
          query = query.gte("precio", 150000);
        }

        if (busqueda.trim() !== "") {
          query = query.or(`titulo.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
        }

        const { data: productosData, error: productosError } = await query;

        if (productosError) {
          console.error("Error cargando productos:", productosError);
          setProductos([]);
          setLoading(false);
          return;
        }

        // 3. Obtener reviews para calificaciones
        if (productosData && productosData.length > 0) {
          const productIds = productosData.map(p => p.id);
          
          const { data: reviewsData } = await supabase
            .from("reviews")
            .select("producto_id, calificacion")
            .in("producto_id", productIds);

          // Calcular promedios
          const productRatings: Record<string, { promedio: number, total: number }> = {};
          
          if (reviewsData) {
            reviewsData.forEach(review => {
              if (!productRatings[review.producto_id]) {
                productRatings[review.producto_id] = { promedio: 0, total: 0 };
              }
              productRatings[review.producto_id].promedio += review.calificacion;
              productRatings[review.producto_id].total += 1;
            });

            Object.keys(productRatings).forEach(productId => {
              const rating = productRatings[productId];
              rating.promedio = rating.promedio / rating.total;
            });
          }

          // Combinar datos
          const productosCompletos = productosData.map((producto) => {
            const ratingInfo = productRatings[producto.id];
            return {
              ...producto,
              vendedor_nombre: producto.usuarios?.nombre || "Vendedor",
              calificacion_promedio: ratingInfo ? Number(ratingInfo.promedio.toFixed(1)) : undefined,
              total_reviews: ratingInfo ? ratingInfo.total : 0
            };
          });

          setProductos(productosCompletos);
        } else {
          setProductos([]);
        }

      } catch (error) {
        console.error("Error inesperado:", error);
        setProductos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [slug, orden, precioFiltro, busqueda]);

  if (!categoria && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Categoría no encontrada</h1>
          <p className="text-gray-600 mb-8">La categoría que buscas no existe.</p>
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Header de la categoría */}
        {categoria && (
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {categoria.nombre}
            </h1>
            {categoria.descripcion && (
              <p className="text-lg text-gray-600 max-w-3xl">
                {categoria.descripcion}
              </p>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 p-6 bg-white rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
            >
              <option value="">Ordenar por</option>
              <option value="menor">Precio: Menor a mayor</option>
              <option value="mayor">Precio: Mayor a menor</option>
              <option value="reciente">Más recientes</option>
            </select>

            <select
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={precioFiltro}
              onChange={(e) => setPrecioFiltro(e.target.value)}
            >
              <option value="">Rango de precio</option>
              <option value="0-50">Menos de $50.000</option>
              <option value="50-150">$50.000 - $150.000</option>
              <option value="150+">Más de $150.000</option>
            </select>

            <input
              type="text"
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1 min-w-[200px]"
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end">
            <span className="text-sm text-gray-600">
              {productos.length} {productos.length === 1 ? 'producto' : 'productos'} encontrados
            </span>
          </div>
        </div>

        {/* Productos */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 mb-4">No hay productos en esta categoría</p>
            <p className="text-sm text-gray-500 mb-4">
              {busqueda || precioFiltro || orden
                ? "Intenta ajustar los filtros de búsqueda"
                : "Sé el primero en publicar un producto en esta categoría"}
            </p>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Volver al inicio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productos.map((producto) => (
              <Link key={producto.id} href={`/product/${producto.id}`}>
                <div className="bg-white rounded-lg shadow hover:shadow-xl transition overflow-hidden cursor-pointer h-full flex flex-col">
                  <div className="relative w-full h-48 bg-gray-100">
                    {producto.imagen_url ? (
                      <Image
                        src={producto.imagen_url}
                        alt={producto.titulo}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">Sin imagen</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                      {producto.titulo}
                    </h3>

                    {producto.descripcion && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {producto.descripcion}
                      </p>
                    )}

                    <p className="text-sm text-gray-600 mb-2">
                      Por: {producto.vendedor_nombre}
                    </p>

                    <div className="mb-3">
                      <StarRating 
                        rating={producto.calificacion_promedio} 
                        totalReviews={producto.total_reviews} 
                      />
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xl font-bold text-gray-900">
                        {formatPrice(producto.precio)}
                      </span>
                      {producto.stock > 0 ? (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          En stock
                        </span>
                      ) : (
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                          Sin stock
                        </span>
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