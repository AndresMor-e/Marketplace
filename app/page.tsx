"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import Image from "next/image";
import Link from "next/link";

interface Product {
  id: string;
  titulo: string;
  precio: number;
  imagen_url: string;
  vendedor_id: string | null;
  vendedor_nombre?: string;
  estado?: string;
  descripcion?: string;
  calificacion_promedio?: number;
  total_reviews?: number;
  categoria_id?: string;
  categoria_nombre?: string;
}

interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
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
          <span className="text-sm text-gray-500 ml-1">Sin reseñas</span>
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
        <span className="text-sm text-gray-600 ml-1">
          {rating} {totalReviews && `(${totalReviews})`}
        </span>
      </div>
    );
  };

  // Cargar categorías
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categorias")
          .select("id, nombre, descripcion")
          .order("nombre");

        if (error) {
          console.error("Error cargando categorías:", error);
          return;
        }

        if (data) {
          setCategories(data);
        }
      } catch (error) {
        console.error("Error inesperado cargando categorías:", error);
      }
    };

    fetchCategories();
  }, []);

  // Cargar productos
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Query base para productos
        let query = supabase
          .from("productos")
          .select(`
            id,
            titulo,
            precio,
            imagen_url,
            vendedor_id,
            estado,
            descripcion,
            categoria_id,
            categorias!inner (
              id,
              nombre
            )
          `)
          .eq("estado", "activo")
          .order("creado_en", { ascending: false });

        // Filtrar por categoría si no es "all"
        if (selectedCategory !== "all") {
          query = query.eq("categoria_id", selectedCategory);
        }

        // Limitar a 8 productos en la página principal
        query = query.limit(8);

        const { data: productsData, error } = await query;

        if (error) {
          console.error("Error cargando productos:", error);
          setLoading(false);
          return;
        }

        if (!productsData || productsData.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        // Traer calificaciones promedio de cada producto
        const productIds = productsData.map(p => p.id);
        
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

          // Calcular promedio final
          Object.keys(productRatings).forEach(productId => {
            const rating = productRatings[productId];
            rating.promedio = rating.promedio / rating.total;
          });
        }

        // Traer vendedores correspondientes
        const vendedorIds = productsData
          .map((p) => p.vendedor_id)
          .filter((id): id is string => !!id);

        let vendedoresMap: Record<string, string> = {};

        if (vendedorIds.length > 0) {
          const { data: vendedores } = await supabase
            .from("usuarios")
            .select("id, nombre")
            .in("id", vendedorIds);

          if (vendedores) {
            vendedores.forEach((v) => {
              vendedoresMap[v.id] = v.nombre;
            });
          }
        }

        // Unir productos + calificaciones + vendedores
        const merged = productsData.map((p) => {
          const ratingInfo = productRatings[p.id];
          
          // Acceder correctamente a los datos de categorías
          let categoriaNombre = "Sin categoría";
          if (p.categorias) {
            if (Array.isArray(p.categorias)) {
              categoriaNombre = p.categorias[0]?.nombre || "Sin categoría";
            } else {
              categoriaNombre = (p.categorias as any).nombre || "Sin categoría";
            }
          }

          return {
            ...p,
            vendedor_nombre: vendedoresMap[p.vendedor_id ?? ""] || "Vendedor",
            calificacion_promedio: ratingInfo ? Number(ratingInfo.promedio.toFixed(1)) : undefined,
            total_reviews: ratingInfo ? ratingInfo.total : 0,
            categoria_nombre: categoriaNombre
          };
        });

        setProducts(merged);

      } catch (error) {
        console.error("Error inesperado:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <HeroSection />

        {/* Filtro de categorías */}
        <section className="my-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">
              Productos destacados
            </h2>
            
            {/* Selector de categorías */}
            <div className="flex items-center gap-4">
              <label htmlFor="category-filter" className="text-sm font-medium text-gray-700">
                Filtrar por categoría:
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid de categorías como navegación */}
          {categories.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Explorar categorías
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${encodeURIComponent(category.nombre)}`}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 text-center cursor-pointer border-2 border-transparent hover:border-blue-500"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 text-lg font-bold">
                        {category.nombre.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {category.nombre}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Productos */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                {selectedCategory === "all" 
                  ? "No hay productos disponibles" 
                  : "No hay productos en esta categoría"}
              </p>
              {selectedCategory !== "all" && (
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Ver todos los productos
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <div className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden cursor-pointer h-full flex flex-col">
                    <div className="relative w-full h-48 bg-gray-100">
                      {product.imagen_url ? (
                        <Image
                          src={product.imagen_url}
                          alt={product.titulo}
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
                      <div className="mb-2">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {product.categoria_nombre}
                        </span>
                      </div>

                      <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                        {product.titulo}
                      </h3>

                      {product.descripcion && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {product.descripcion}
                        </p>
                      )}

                      <p className="text-sm text-gray-600 mb-2">
                        Por: {product.vendedor_nombre}
                      </p>

                      {/* Calificación con estrellas */}
                      <div className="mb-3">
                        <StarRating 
                          rating={product.calificacion_promedio} 
                          totalReviews={product.total_reviews} 
                        />
                      </div>

                      <div className="mt-auto">
                        <span className="text-xl font-bold text-gray-900">
                          {formatPrice(product.precio)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}