"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import CategoryGrid from "@/components/category-grid";
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
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Función para formatear el precio - VERSIÓN CORREGIDA
  const formatPrice = (price: number | string) => {
    try {
      let priceNumber: number;
      
      // Convertir a número
      if (typeof price === 'string') {
        // Remover símbolos no numéricos excepto punto y coma
        const cleanString = price.toString().replace(/[^\d.,]/g, '');
        // Reemplazar coma por punto para parseFloat
        priceNumber = parseFloat(cleanString.replace(',', '.'));
      } else {
        priceNumber = price;
      }
      
      if (isNaN(priceNumber)) {
        console.warn(`Precio inválido: ${price}`);
        return `$${price}`;
      }
      
      // DEBUG: Mostrar en consola para verificar
      console.log(`Formateando precio: ${price} -> ${priceNumber}`);
      
      // Si el número es muy grande (ej: 100000), probablemente necesita formato de miles
      if (priceNumber >= 1000) {
        return `$${priceNumber.toLocaleString('es-CO')}`;
      }
      
      // Para números pequeños, mostrar normalmente
      return `$${priceNumber.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
      
    } catch (error) {
      console.error('Error formateando precio:', error);
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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log("Cargando productos...");

        // 1) Traer productos activos
        const { data: productsData, error } = await supabase
          .from("productos")
          .select(`
            id,
            titulo,
            precio,
            imagen_url,
            vendedor_id,
            estado,
            descripcion
          `)
          .eq("estado", "activo")
          .limit(8)
          .order("creado_en", { ascending: false });

        console.log("Productos encontrados:", productsData);
        
        // Debug: Ver precios originales
        if (productsData) {
          console.log("DEBUG - Precios crudos desde BD:");
          productsData.forEach(product => {
            console.log(`Producto: ${product.titulo}, Precio original: ${product.precio}, Tipo: ${typeof product.precio}`);
          });
        }

        if (error) {
          console.error("Error cargando productos:", error);
          setLoading(false);
          return;
        }

        if (!productsData || productsData.length === 0) {
          console.log("No se encontraron productos");
          setProducts([]);
          setLoading(false);
          return;
        }

        // 2) Traer calificaciones promedio de cada producto
        const productIds = productsData.map(p => p.id);
        
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select("producto_id, calificacion")
          .in("producto_id", productIds);

        console.log("Reviews encontradas:", reviewsData);

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

        // 3) Traer vendedores correspondientes
        const vendedorIds = productsData
          .map((p) => p.vendedor_id)
          .filter((id): id is string => !!id);

        let vendedoresMap: Record<string, string> = {};

        if (vendedorIds.length > 0) {
          const { data: vendedores, error: vendedoresError } = await supabase
            .from("usuarios")
            .select("id, nombre")
            .in("id", vendedorIds);

          console.log("Vendedores encontrados:", vendedores);

          if (vendedores) {
            vendedores.forEach((v) => {
              vendedoresMap[v.id] = v.nombre;
            });
          }
        }

        // 4) Unir productos + calificaciones + vendedores
        const merged = productsData.map((p) => {
          const ratingInfo = productRatings[p.id];
          return {
            ...p,
            vendedor_nombre: vendedoresMap[p.vendedor_id ?? ""] || "Vendedor",
            calificacion_promedio: ratingInfo ? Number(ratingInfo.promedio.toFixed(1)) : undefined,
            total_reviews: ratingInfo ? ratingInfo.total : 0
          };
        });

        console.log("Productos finales:", merged);
        setProducts(merged);

      } catch (error) {
        console.error("Error inesperado:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <HeroSection />

        <section className="my-16">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">
            Productos destacados
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No hay productos disponibles</p>
              <p className="text-sm text-gray-500">
                Los vendedores aún no han publicado productos.
              </p>
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