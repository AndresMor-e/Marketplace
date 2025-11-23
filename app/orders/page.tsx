"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import Link from "next/link";
import { Star } from "lucide-react";

interface Orden {
  id: string;
  estado: string;
  total: number;
  creado_en: string;
}

interface Review {
  id: string;
  producto_id: string;
  producto_titulo: string;
  calificacion: number;
  comentario: string;
  creado_en: string;
}

// Función para formatear precio
const formatPrice = (price: number) => {
  return `$${price.toLocaleString('es-CO')}`;
};

// Función para obtener los estilos según el estado
const getEstadoStyles = (estado: string) => {
  switch (estado) {
    case "pagado":
      return "bg-green-100 text-green-800";
    case "entregado":
      return "bg-green-100 text-green-800";
    case "enviado":
      return "bg-blue-100 text-blue-800";
    case "completado":
      return "bg-green-100 text-green-800";
    case "pendiente":
      return "bg-yellow-100 text-yellow-800";
    case "en_devolucion":
      return "bg-orange-100 text-orange-800";
    case "cancelado":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Función para formatear el texto del estado
const formatEstadoText = (estado: string) => {
  const estados: { [key: string]: string } = {
    "pagado": "Pagado",
    "entregado": "Entregado",
    "enviado": "Enviado",
    "completado": "Completado",
    "pendiente": "Pendiente",
    "en_devolucion": "En Devolución",
    "cancelado": "Cancelado"
  };
  return estados[estado] || estado;
};

export default function OrdersPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Obtener órdenes
      const { data: ordenesData, error: ordenesError } = await supabase
        .from("ordenes")
        .select("*")
        .eq("usuario_id", user.id)
        .order("creado_en", { ascending: false });

      if (!ordenesError && ordenesData) {
        setOrdenes(ordenesData);
      }

      // Obtener reviews del usuario
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          *,
          productos (
            titulo
          )
        `)
        .eq("usuario_id", user.id)
        .order("creado_en", { ascending: false });

      if (!reviewsError && reviewsData) {
        const formattedReviews = reviewsData.map(review => ({
          id: review.id,
          producto_id: review.producto_id,
          producto_titulo: review.productos?.titulo || "Producto no disponible",
          calificacion: review.calificacion,
          comentario: review.comentario,
          creado_en: review.creado_en
        }));
        setReviews(formattedReviews);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Sección de Órdenes */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Mis Órdenes</h2>

          {ordenes.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">Aún no has realizado compras</p>
              <Link href="/" className="text-blue-600 hover:underline font-medium">
                Ir a comprar
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      ID Orden
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ordenes.map((orden) => (
                    <tr key={orden.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        #{orden.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(orden.creado_en).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatPrice(orden.total)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEstadoStyles(orden.estado)}`}
                        >
                          {formatEstadoText(orden.estado)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/order/${orden.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Ver Detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sección de Reviews - Separada de las órdenes */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Mis Reseñas</h2>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">Aún no has escrito reseñas</p>
              <p className="text-gray-500 text-sm">
                Compra productos y comparte tu experiencia con otros compradores
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="divide-y divide-gray-200">
                {reviews.map((review) => (
                  <div key={review.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg mb-2">
                          {review.producto_titulo}
                        </h3>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.calificacion
                                  ? "text-yellow-500 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-2">
                            {review.calificacion}.0
                          </span>
                        </div>
                      </div>
                      <div className="ml-6 flex-shrink-0">
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {new Date(review.creado_en).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-gray-700 leading-relaxed">
                        {review.comentario}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}