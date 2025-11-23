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

export default function VendorDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const vendedorId = user.id; // tu tabla productos usa vendedor_id de usuarios.id

      // 1. TOTAL PRODUCTOS
      const { count: totalProducts } = await supabase
        .from("productos")
        .select("*", { count: "exact", head: true })
        .eq("vendedor_id", vendedorId);

      // 2. OBTENER ID DE PRODUCTOS DEL VENDEDOR
      const { data: products } = await supabase
        .from("productos")
        .select("id, precio")
        .eq("vendedor_id", vendedorId);

      const productIds = products?.map((p) => p.id) ?? [];

      // 3. TOTAL ÓRDENES DONDE SE COMPRARON SUS PRODUCTOS
      const { data: orderItems } = await supabase
        .from("detalles_orden")
        .select("orden_id, cantidad, precio")
        .in("producto_id", productIds);

      // total órdenes únicas
      const totalOrders = orderItems
        ? new Set(orderItems.map((o) => o.orden_id)).size
        : 0;

      // 4. TOTAL REVENUE
      const totalRevenue = orderItems
        ? orderItems.reduce(
            (sum, item) => sum + item.cantidad * Number(item.precio),
            0
          )
        : 0;

      // 5. RATING PROMEDIO (ES DE REVIEWS DE SUS PRODUCTOS)
      const { data: reviews } = await supabase
        .from("reviews")
        .select("calificacion")
        .in("producto_id", productIds);

      const averageRating =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.calificacion, 0) /
            reviews.length
          : 0;

      setStats({
        totalProducts: totalProducts || 0,
        totalOrders,
        totalRevenue,
        averageRating,
      });

      setLoading(false);
    };

    fetchStats();
  }, [supabase]);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-8 text-gray-900">Resumen del vendedor</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Productos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalProducts}
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
                {stats.totalOrders}
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
                ${stats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-purple-100 p-4 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}