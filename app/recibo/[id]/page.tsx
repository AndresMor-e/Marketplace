"use client";

import { useEffect, useState } from "react";
import { useParams } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Download, Printer, MapPin, Calendar, CreditCard } from 'lucide-react';

interface Producto {
  id: string;
  titulo: string;
  precio: number;
  imagen_url: string;
  vendedor_nombre: string;
}

interface ItemOrden {
  id: string;
  cantidad: number;
  precio: number;
  productos: Producto;
}

interface Orden {
  id: string;
  estado: string;
  total: number;
  creado_en: string;
  direccion: any;
  items: ItemOrden[];
}

export default function ReciboPage() {
  const params = useParams();
  const id = params.id as string;
  const [orden, setOrden] = useState<Orden | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data: ordenData, error: ordenError } = await supabase
          .from("ordenes")
          .select(`
            *,
            direcciones (*)
          `)
          .eq("id", id)
          .single();

        if (ordenError) throw ordenError;

        const { data: itemsData, error: itemsError } = await supabase
          .from("detalles_orden")
          .select(`
            *,
            productos (*)
          `)
          .eq("orden_id", id);

        if (itemsError) throw itemsError;

        setOrden({
          ...ordenData,
          direccion: ordenData.direcciones,
          items: itemsData || []
        });
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    }
  }, [id]);

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Simular descarga del recibo
    const element = document.createElement("a");
    const file = new Blob([document.getElementById('recibo-content')?.innerHTML || ''], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `recibo-${orden?.id}.html`;
    document.body.appendChild(element);
    element.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">Cargando...</div>
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Recibo no encontrado</p>
            <Link href="/orders">
              <Button className="mt-4">Volver a mis órdenes</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const subtotal = orden.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const envio = 0;
  const impuestos = subtotal * 0.10;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header del recibo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resumen del pedido</h1>
              <p className="text-gray-600">
                Pedido realizado {new Date(orden.creado_en).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })} | N.º de pedido {orden.id.slice(0, 8).toUpperCase()}-{orden.id.slice(8, 16).toUpperCase()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                Descargar
              </Button>
            </div>
          </div>

          <div id="recibo-content">
            {/* Información de envío */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Enviar a</h2>
              {orden.direccion && (
                <div className="text-gray-600">
                  <p className="font-semibold">{orden.direccion.nombre_completo}</p>
                  <p>{orden.direccion.direccion}</p>
                  <p>{orden.direccion.departamento && `${orden.direccion.departamento}, `}{orden.direccion.ciudad}</p>
                  <p>{orden.direccion.codigo_postal}</p>
                  <p>{orden.direccion.pais}</p>
                  {orden.direccion.telefono && <p>Tel: {orden.direccion.telefono}</p>}
                </div>
              )}
            </div>

            {/* Método de pago */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Método de pago</h2>
              <div className="flex items-center gap-2 text-gray-600">
                <CreditCard className="w-5 h-5" />
                <span>Pago contra entrega</span>
              </div>
            </div>

            {/* Resumen del pedido */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Resumen del pedido</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Productos:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span className="text-green-600">GRATIS</span>
                </div>
                <div className="flex justify-between">
                  <span>Impuestos (10%):</span>
                  <span>{formatPrice(impuestos)}</span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatPrice(orden.total)}</span>
                </div>
              </div>
            </div>

            {/* Productos */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Productos</h2>
              <div className="space-y-4">
                {orden.items?.map((item) => (
                  <div key={item.id} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.productos?.titulo}</h3>
                        <p className="text-sm text-gray-600">Vendido por: {item.productos?.vendedor_nombre || "ShopQuilla"}</p>
                        <p className="text-sm text-gray-600">Cantidad: {item.cantidad}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatPrice(item.precio * item.cantidad)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Botones de navegación */}
        <div className="flex justify-center gap-4">
          <Link href={`/order/${orden.id}`}>
            <Button variant="outline">
              Volver al detalle del pedido
            </Button>
          </Link>
          <Link href="/orders">
            <Button>
              Ver todas mis órdenes
            </Button>
          </Link>
        </div>
      </main>

      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          .navbar, button, [class*="flex justify-center"] {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .bg-gray-50 {
            background: white !important;
          }
          .shadow-sm, .border {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>
    </div>
  );
}