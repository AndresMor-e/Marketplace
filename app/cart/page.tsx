"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Plus, Minus } from "lucide-react";

/* Tipos adaptados a tus tablas */
type Producto = {
  id: string;
  titulo: string;
  precio: number;
  stock: number;
  imagen_url: string | null;
};

type ItemCarrito = {
  id: string;
  cantidad: number;
  productos: Producto | null; // Cambié de 'producto' a 'productos' para coincidir con la consulta
};

export default function CartPage() {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();
  const supabase = createClient();

  /* Cargar carrito CORREGIDO */
  useEffect(() => {
    const fetchCart = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUser(user);

      console.log(" Cargando carrito para usuario:", user.id);

      // CONSULTA CORREGIDA - usando la sintaxis correcta de joins
      const { data, error } = await supabase
        .from("carrito")
        .select(`
          id,
          cantidad,
          productos!inner (
            id,
            titulo,
            precio,
            stock,
            imagen_url
          )
        `)
        .eq("usuario_id", user.id);

      console.log("Datos del carrito:", data);
      console.log("Error del carrito:", error);

      if (error) {
        console.error("Error detallado:", error);
        setLoading(false);
        return;
      }

      if (data) {
        // Mapear correctamente los datos
        const itemsCarrito = data.map((item: any) => ({
          id: item.id,
          cantidad: item.cantidad,
          productos: item.productos // Ahora sí coincide
        }));

        console.log(" Items procesados:", itemsCarrito);
        setItems(itemsCarrito);
      }

      setLoading(false);
    };

    fetchCart();
  }, []);

  /* Actualizar cantidad */
  const updateCantidad = async (id: string, cantidad: number) => {
    if (cantidad <= 0) return removeItem(id);

    const { error } = await supabase
      .from("carrito")
      .update({ cantidad })
      .eq("id", id);

    if (!error) {
      setItems(items.map((i) => (i.id === id ? { ...i, cantidad } : i)));
    } else {
      console.error("Error actualizando cantidad:", error);
    }
  };

  /* Eliminar item */
  const removeItem = async (id: string) => {
    const { error } = await supabase.from("carrito").delete().eq("id", id);

    if (!error) {
      setItems(items.filter((i) => i.id !== id));
    } else {
      console.error("Error eliminando item:", error);
    }
  };

  /* Calcular total */
  const calcularTotal = () => {
    return items.reduce((total, i) => total + i.cantidad * (i.productos?.precio || 0), 0);
  };

  /* Función para formatear precio */
  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')}`;
  };

  /* Cargando */
  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          Cargando carrito...
        </div>
      </div>
    );

  const total = calcularTotal();
  const impuestos = total * 0.1;
  const totalConImpuestos = total + impuestos;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Carrito</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">Tu carrito está vacío.</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                Continuar comprando
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 🛍 Lista de productos */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-6 p-6 border-b border-gray-200 last:border-b-0"
                  >
                    {/* Imagen */}
                    <div className="relative w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0">
                      {item.productos?.imagen_url ? (
                        <Image
                          src={item.productos.imagen_url}
                          alt={item.productos.titulo || "Producto"}
                          fill
                          className="object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500 text-sm">Sin imagen</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg mb-2">
                        {item.productos?.titulo || "Producto no disponible"}
                      </h3>
                      <p className="text-lg font-bold text-gray-900">
                        {item.productos ? formatPrice(item.productos.precio) : "$0"}
                      </p>
                      {item.productos && (
                        <p className="text-sm text-gray-600 mt-1">
                          Stock disponible: {item.productos.stock}
                        </p>
                      )}
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCantidad(item.id, item.cantidad - 1)}
                        disabled={item.cantidad <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>

                      <span className="w-12 text-center font-medium text-lg">
                        {item.cantidad}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCantidad(item.id, item.cantidad + 1)}
                        disabled={item.cantidad >= (item.productos?.stock || 0)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-32">
                      <p className="text-lg font-bold text-gray-900">
                        {item.productos ? formatPrice(item.productos.precio * item.cantidad) : "$0"}
                      </p>
                    </div>

                    {/* Eliminar */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Resumen del pedido</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.length} productos)</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span>$5000</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Impuestos (10%)</span>
                  <span>{formatPrice(impuestos)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(totalConImpuestos)}</span>
                </div>
              </div>

              <Link href="/checkout">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-bold">
                  Continuar con el pago
                </Button>
              </Link>

              <Link href="/">
                <Button variant="outline" className="w-full mt-3">
                  Seguir comprando
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}