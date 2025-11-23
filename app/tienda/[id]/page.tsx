"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Star, MapPin, Calendar, ShoppingBag, Mail } from "lucide-react";
import Link from "next/link";

interface Tienda {
  id: string;
  vendedor_id: string;
  nombre_tienda: string;
  descripcion: string;
  logo_url: string;
  creado_en: string;
  vendedor?: {
    nombre: string;
    email: string;
  };
}

interface Producto {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
  imagen_url: string;
  stock: number;
  rating: number;
  total_reviews: number;
  vendedor_id: string;
  tienda_id: string;
}

// Función para formatear el precio
const formatPrice = (price: number) => {
  return `$${price.toLocaleString('es-CO')}`;
};

// Función para mostrar estrellas de rating
const renderStars = (rating: number) => {
  return [...Array(5)].map((_, i) => (
    <Star
      key={i}
      className={`w-4 h-4 ${
        i < Math.floor(rating) ? "text-yellow-500 fill-current" : "text-gray-300"
      }`}
    />
  ));
};

export default function TiendaPage() {
  const params = useParams();
  const id = params.id as string;

  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchTiendaYProductos = async () => {
      try {
        setError(null);
        console.log("🛍️ Buscando tienda con ID:", id);

        if (!id) {
          setError("ID de tienda no válido");
          setLoading(false);
          return;
        }

        // PRIMERO: Obtener la tienda
        const { data: tiendaData, error: tiendaError } = await supabase
          .from("tiendas")
          .select("*")
          .eq("id", id)
          .single();

        if (tiendaError) {
          console.error("❌ Error fetching tienda:", tiendaError);
          setError("Tienda no encontrada");
          setLoading(false);
          return;
        }

        console.log("✅ Tienda encontrada:", tiendaData);

        // SEGUNDO: Obtener información del vendedor
        let tiendaConVendedor = tiendaData;
        if (tiendaData.vendedor_id) {
          const { data: vendedorData, error: vendedorError } = await supabase
            .from("usuarios")
            .select("nombre, email")
            .eq("id", tiendaData.vendedor_id)
            .single();

          if (!vendedorError && vendedorData) {
            tiendaConVendedor = {
              ...tiendaData,
              vendedor: vendedorData
            };
            console.log("✅ Información del vendedor obtenida");
          }
        }

        setTienda(tiendaConVendedor);

        // TERCERO: Obtener productos de esta tienda
        // Intentamos primero por tienda_id, luego por vendedor_id como fallback
        let productosList: Producto[] = [];
        
        // PRIMER INTENTO: Buscar productos por tienda_id
        const { data: productosPorTienda, error: errorPorTienda } = await supabase
          .from("productos")
          .select("*")
          .eq("tienda_id", id)
          .eq("estado", "activo")
          .order("creado_en", { ascending: false });

        if (!errorPorTienda && productosPorTienda && productosPorTienda.length > 0) {
          console.log("✅ Productos encontrados por tienda_id:", productosPorTienda.length);
          productosList = await calcularRatingsProductos(productosPorTienda);
        } else {
          // SEGUNDO INTENTO: Buscar productos por vendedor_id (fallback)
          console.log("ℹ️ No se encontraron productos por tienda_id, buscando por vendedor_id...");
          const { data: productosPorVendedor, error: errorPorVendedor } = await supabase
            .from("productos")
            .select("*")
            .eq("vendedor_id", tiendaData.vendedor_id)
            .eq("estado", "activo")
            .order("creado_en", { ascending: false });

          if (!errorPorVendedor && productosPorVendedor) {
            console.log("✅ Productos encontrados por vendedor_id:", productosPorVendedor.length);
            productosList = await calcularRatingsProductos(productosPorVendedor);
          } else {
            console.log("⚠️ No se encontraron productos para esta tienda");
          }
        }

        console.log("📦 Productos finales a mostrar:", productosList.length);
        setProductos(productosList);

      } catch (error) {
        console.error("❌ Error general:", error);
        setError("Error al cargar la tienda");
      } finally {
        setLoading(false);
      }
    };

    // Función para calcular ratings de productos
    const calcularRatingsProductos = async (productosData: any[]): Promise<Producto[]> => {
      const productosConRating = await Promise.all(
        productosData.map(async (producto) => {
          // Obtener reviews de este producto
          const { data: reviewsData, error: reviewsError } = await supabase
            .from("reviews")
            .select("calificacion")
            .eq("producto_id", producto.id);

          let rating = 0;
          let total_reviews = 0;

          if (!reviewsError && reviewsData && reviewsData.length > 0) {
            total_reviews = reviewsData.length;
            rating = reviewsData.reduce((sum, r) => sum + r.calificacion, 0) / total_reviews;
          }

          return {
            id: producto.id,
            titulo: producto.titulo,
            descripcion: producto.descripcion,
            precio: producto.precio,
            imagen_url: producto.imagen_url,
            stock: producto.stock,
            rating,
            total_reviews,
            vendedor_id: producto.vendedor_id,
            tienda_id: producto.tienda_id
          };
        })
      );

      return productosConRating;
    };

    fetchTiendaYProductos();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando tienda...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tienda) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24 flex-col gap-4">
          <p className="text-red-600 text-lg text-center max-w-md">
            {error || "Tienda no encontrada"}
          </p>
          <Button onClick={() => window.location.href = "/"}>
            Volver a la tienda principal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header de la tienda */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Logo de la tienda */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {tienda.logo_url ? (
                    <Image
                      src={tienda.logo_url}
                      alt={tienda.nombre_tienda}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <ShoppingBag className="w-12 h-12 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Información de la tienda */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {tienda.nombre_tienda}
                </h1>
                
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {tienda.descripcion || "Esta tienda aún no tiene descripción."}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Miembro desde {new Date(tienda.creado_en).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4" />
                    <span>{productos.length} productos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Productos de la tienda */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Productos de la tienda
            </h2>
            <span className="text-gray-600">
              {productos.length} {productos.length === 1 ? 'producto' : 'productos'} encontrados
            </span>
          </div>

          {productos.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Esta tienda aún no tiene productos
              </h3>
              <p className="text-gray-600">
                El vendedor aún no ha agregado productos a su catálogo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productos.map((producto) => (
                <Link 
                  key={producto.id} 
                  href={`/product/${producto.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="aspect-square bg-gray-100 relative">
                    <Image
                      src={producto.imagen_url || "/placeholder.svg"}
                      alt={producto.titulo}
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {producto.titulo}
                    </h3>
                    
                    <div className="flex items-center gap-1 mb-2">
                      {renderStars(producto.rating)}
                      <span className="text-sm text-gray-600 ml-1">
                        ({producto.total_reviews})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(producto.precio)}
                      </span>
                      {producto.stock === 0 && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          Agotado
                        </span>
                      )}
                    </div>

                    {producto.stock > 0 && producto.stock < 10 && (
                      <p className="text-xs text-orange-600 mt-2">
                        Solo {producto.stock} disponibles
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}