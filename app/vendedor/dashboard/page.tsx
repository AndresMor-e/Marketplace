"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Package, ShoppingCart, Star } from "lucide-react";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
}

interface Review {
  id: string;
  calificacion: number;
  comentario: string;
  creado_en: string;
  productos: {
    titulo: string;
  }[]; // Cambiado a array porque Supabase retorna arrays para relaciones
  usuarios: {
    nombre: string;
  }[]; // Cambiado a array porque Supabase retorna arrays para relaciones
}

// Interfaces para tipar los datos de Supabase
interface Producto {
  id: string;
  precio: number;
  titulo: string;
}

interface DetalleOrden {
  orden_id: string;
  cantidad: number;
  precio: number;
}

// Función para formatear precio en formato colombiano
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

// Función para renderizar estrellas
const renderStars = (rating: number) => {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-2 text-sm font-medium text-gray-700">
        {rating.toFixed(1)}
      </span>
    </div>
  );
};

// Función helper para obtener el primer elemento de un array (para relaciones)
const getFirstRelation = <T,>(relation: T[] | null): T | null => {
  return relation && relation.length > 0 ? relation[0] : null;
};

export default function VendorDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const vendedorId = user.id;

      try {
        console.log("Iniciando fetch de stats para vendedor:", vendedorId);

        // 1. TOTAL PRODUCTOS
        const { count: totalProducts, error: productsError } = await supabase
          .from("productos")
          .select("*", { count: "exact", head: true })
          .eq("vendedor_id", vendedorId);

        if (productsError) {
          console.error("Error fetching productos:", productsError);
          throw productsError;
        }

        console.log("Total productos:", totalProducts);

        // 2. OBTENER ID DE PRODUCTOS DEL VENDEDOR
        const { data: products, error: productsDataError } = await supabase
          .from("productos")
          .select("id, precio, titulo")
          .eq("vendedor_id", vendedorId);

        if (productsDataError) {
          console.error("Error fetching products data:", productsDataError);
          throw productsDataError;
        }

        const productIds = products?.map((p) => p.id) ?? [];
        console.log("IDs de productos:", productIds);

        // 3. TOTAL ÓRDENES DONDE SE COMPRARON SUS PRODUCTOS
        let totalOrders = 0;
        let totalRevenue = 0;

        if (productIds.length > 0) {
          // Obtener detalles de orden para los productos del vendedor
          const { data: orderItems, error: orderItemsError } = await supabase
            .from("detalles_orden")
            .select("orden_id, cantidad, precio")
            .in("producto_id", productIds);

          if (orderItemsError) {
            console.error("Error fetching order items:", orderItemsError);
            throw orderItemsError;
          }

          console.log("🛒 Detalles de orden:", orderItems);

          // total órdenes únicas
          totalOrders = orderItems
            ? new Set(orderItems.map((o) => o.orden_id)).size
            : 0;

          // Calcular revenue total
          totalRevenue = orderItems
            ? orderItems.reduce(
                (sum, item) => sum + (item.cantidad * Number(item.precio)),
                0
              )
            : 0;

          console.log("Total órdenes:", totalOrders);
          console.log("Total revenue:", totalRevenue);
        }

        // 4. RATING PROMEDIO Y REVIEWS
        let averageRating = 0;
        let vendorReviews: Review[] = [];

        if (productIds.length > 0) {
          const { data: reviewsData, error: reviewsError } = await supabase
            .from("reviews")
            .select(`
              id,
              calificacion,
              comentario,
              creado_en,
              productos (
                titulo
              ),
              usuarios (
                nombre
              )
            `)
            .in("producto_id", productIds)
            .order('creado_en', { ascending: false });

          if (reviewsError) {
            console.error("Error fetching reviews:", reviewsError);
            throw reviewsError;
          }

          console.log("Reviews:", reviewsData);

          vendorReviews = (reviewsData as Review[]) || [];

          averageRating =
            vendorReviews.length > 0
              ? Number((vendorReviews.reduce((sum, r) => sum + r.calificacion, 0) / vendorReviews.length).toFixed(1))
              : 0;

          console.log("Rating promedio:", averageRating);
          console.log("Total reviews:", vendorReviews.length);
        }

        setStats({
          totalProducts: totalProducts || 0,
          totalOrders,
          totalRevenue,
          averageRating,
        });

        setReviews(vendorReviews);

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [supabase]);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-lg">Cargando estadísticas...</div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Sección de Estadísticas */}
      <div>
        <h2 className="text-2xl font-bold mb-8 text-gray-900">Resumen del vendedor</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Productos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatPrice(stats.totalProducts)}
                </p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Órdenes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatPrice(stats.totalOrders)}
                </p>
              </div>
              <div className="bg-green-100 p-4 rounded-full">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Average Rating */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Rating Promedio</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.averageRating.toFixed(1)}
                </p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-full">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Ingresos Totales</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${formatPrice(stats.totalRevenue)}
                </p>
              </div>
              <div className="bg-purple-100 p-4 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Reviews */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Mis Reseñas</h2>
          <p className="text-gray-600 mt-2">
            {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'} de clientes
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {reviews.length > 0 ? (
            reviews.map((review) => {
              const producto = getFirstRelation(review.productos);
              const usuario = getFirstRelation(review.usuarios);
              
              return (
                <div key={review.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {producto?.titulo || 'Producto'}
                      </h3>
                      <div className="mt-1">
                        {renderStars(review.calificacion)}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.creado_en).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  
                  {review.comentario && (
                    <p className="text-gray-700 leading-relaxed">
                      {review.comentario}
                    </p>
                  )}
                  
                  <div className="mt-3 text-sm text-gray-500">
                    Por: {usuario?.nombre || 'Cliente'}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay reseñas aún
              </h3>
              <p className="text-gray-500">
                Las reseñas de tus clientes aparecerán aquí cuando empiecen a calificar tus productos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}