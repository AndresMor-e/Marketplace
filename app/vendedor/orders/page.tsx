"use client";

import { useEffect, useState } from "react";

interface VendorOrderItem {
  id: string;
  cantidad: number;
  precio: number;
  producto: {
    titulo: string;
  };
}

interface VendorOrder {
  id: string;
  estado: string;
  creado_en: string;
  usuario: {
    nombre: string;
    email: string;
  };
  items: VendorOrderItem[];
}

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/vendor/orders`,
          {
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error("Error al cargar las órdenes");
        }

        const data = await res.json();

        // Agrupar por orden
        const ordersMap: Record<string, VendorOrder> = {};

        data.forEach((row: any) => {
          const order = row.ordenes;
          const producto = row.productos;

          if (!ordersMap[order.id]) {
            ordersMap[order.id] = {
              id: order.id,
              estado: order.estado,
              creado_en: order.creado_en,
              usuario: {
                nombre: order.usuarios.nombre,
                email: order.usuarios.email,
              },
              items: [],
            };
          }

          ordersMap[order.id].items.push({
            id: row.id,
            cantidad: row.cantidad,
            precio: row.precio,
            producto: { titulo: producto.titulo },
          });
        });

        setOrders(Object.values(ordersMap));
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  if (loading) return <p className="p-6">Cargando órdenes...</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Órdenes del vendedor</h1>

      {orders.length === 0 && <p>No hay órdenes registradas.</p>}

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border p-4 rounded">
            <p><strong>ID:</strong> {order.id}</p>
            <p><strong>Estado:</strong> {order.estado}</p>
            <p>
              <strong>Cliente:</strong> {order.usuario.nombre} ({order.usuario.email})
            </p>
            <p><strong>Fecha:</strong> {new Date(order.creado_en).toLocaleString()}</p>

            <h3 className="mt-2 font-semibold">Productos:</h3>
            <ul className="ml-4 list-disc">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.producto.titulo} — {item.cantidad} × ${item.precio}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}