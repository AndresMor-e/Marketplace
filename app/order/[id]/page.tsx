"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { CheckCircle2, Package, MapPin, Calendar, CreditCard, Star, FileText, Truck, RotateCcw, X } from 'lucide-react';

interface Producto {
  id: string;
  titulo: string;
  precio: number;
  imagen_url: string;
  vendedor_nombre: string;
  slug?: string;
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

interface DevolucionData {
  motivo: string;
  razon: string;
  comentarios: string;
  producto_id: string;
  orden_id: string;
}

interface OpinionData {
  producto_id: string;
  orden_id: string;
  calificacion: number;
  comentario: string;
  titulo?: string;
}

// Función para formatear el texto del estado
const formatEstadoText = (estado: string) => {
  const estados: { [key: string]: string } = {
    "pagado": "Pagado",
    "entregado": "Entregado",
    "enviado": "Enviado",
    "completado": "Completado",
    "pendiente": "Pendiente",
    "en_devolucion": "En devolución",
    "En devolución": "En devolución",
    "cancelado": "Cancelado"
  };
  return estados[estado] || estado;
};

// Función para obtener los estilos según el estado
const getEstadoStyles = (estado: string) => {
  const estadoNormalizado = estado.toLowerCase();
  
  if (estadoNormalizado.includes('devolucion') || estadoNormalizado.includes('devolución')) {
    return "bg-yellow-100 text-yellow-800";
  }
  
  switch (estadoNormalizado) {
    case "pagado":
    case "entregado":
    case "completado":
      return "bg-green-100 text-green-800";
    case "enviado":
      return "bg-blue-100 text-blue-800";
    case "pendiente":
      return "bg-yellow-100 text-yellow-800";
    case "cancelado":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function OrderConfirmation() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [orden, setOrden] = useState<Orden | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarModalDevolucion, setMostrarModalDevolucion] = useState(false);
  const [mostrarModalOpinion, setMostrarModalOpinion] = useState(false);
  const [productoDevolucion, setProductoDevolucion] = useState<Producto | null>(null);
  const [productoOpinion, setProductoOpinion] = useState<Producto | null>(null);
  const [devolucionData, setDevolucionData] = useState<DevolucionData>({
    motivo: "",
    razon: "",
    comentarios: "",
    producto_id: "",
    orden_id: ""
  });
  const [opinionData, setOpinionData] = useState<OpinionData>({
    producto_id: "",
    orden_id: "",
    calificacion: 0,
    comentario: "",
    titulo: ""
  });
  const [hoverRating, setHoverRating] = useState(0);
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

  const calcularFechaDevolucion = (fechaCompra: string) => {
    const fecha = new Date(fechaCompra);
    fecha.setDate(fecha.getDate() + 1);
    return fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const puedeDevolver = (fechaCompra: string) => {
    const fechaDevolucion = new Date(fechaCompra);
    fechaDevolucion.setDate(fechaDevolucion.getDate() + 1);
    return new Date() <= fechaDevolucion;
  };

  const handleComprarNuevamente = (producto: Producto) => {
    router.push('/checkout');
    setTimeout(() => {
      localStorage.setItem('productoComprarNuevamente', producto.id);
    }, 100);
  };

  const handleVerArticulo = (producto: Producto) => {
    router.push(`/product/${producto.id}`);
  };

  const handleVerRecibo = () => {
    router.push(`/recibo/${orden?.id}`);
  };

  const handleAbrirDevolucion = (producto: Producto) => {
    if (!puedeDevolver(orden?.creado_en || '')) {
      alert("La ventana de devolución ha expirado");
      return;
    }
    
    setProductoDevolucion(producto);
    setDevolucionData({
      motivo: "",
      razon: "",
      comentarios: "",
      producto_id: producto.id,
      orden_id: orden?.id || ""
    });
    setMostrarModalDevolucion(true);
  };

  const handleSolicitarDevolucion = async () => {
    if (!devolucionData.motivo || !devolucionData.razon) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    try {
      // 1. Insertar la solicitud de devolución en tu tabla
      const { data: devolucion, error: devolucionError } = await supabase
        .from("devoluciones")
        .insert([{
          motivo: devolucionData.motivo,
          razon: devolucionData.razon,
          comentarios: devolucionData.comentarios,
          producto_id: devolucionData.producto_id,
          orden_id: devolucionData.orden_id,
          estado: "pendiente",
          fecha_solicitud: new Date().toISOString()
        }])
        .select()
        .single();

      if (devolucionError) throw devolucionError;

      // 2. Buscar el item de la orden para obtener la cantidad
      const itemOrden = orden?.items.find(item => 
        item.productos.id === devolucionData.producto_id
      );

      if (itemOrden) {
        // 3. Si solo hay un producto en la orden, marcar toda la orden como en devolución
        if (orden?.items.length === 1) {
          const { error: ordenError } = await supabase
            .from("ordenes")
            .update({ estado: "en_devolucion" })
            .eq("id", orden.id);

          if (ordenError) throw ordenError;
          
          // Actualizar el estado local
          setOrden(prev => prev ? { ...prev, estado: "en_devolucion" } : null);
        }
        
        // 4. Actualizar stock del producto (revertir la compra)
        const { error: stockError } = await supabase
          .from("productos")
          .update({ 
            stock: supabase.rpc('increment', {
              table_name: 'productos',
              column_name: 'stock',
              id: itemOrden.productos.id,
              increment: itemOrden.cantidad
            })
          })
          .eq("id", itemOrden.productos.id);

        if (stockError) {
          console.error("Error actualizando stock:", stockError);
          // Usar método alternativo si falla
          const { data: productoActual } = await supabase
            .from("productos")
            .select("stock")
            .eq("id", itemOrden.productos.id)
            .single();

          if (productoActual) {
            const nuevoStock = productoActual.stock + itemOrden.cantidad;
            await supabase
              .from("productos")
              .update({ stock: nuevoStock })
              .eq("id", itemOrden.productos.id);
          }
        }
      }

      alert("Solicitud de devolución enviada correctamente. El stock ha sido actualizado y el reembolso está en proceso.");
      setMostrarModalDevolucion(false);
      setProductoDevolucion(null);
      setDevolucionData({
        motivo: "",
        razon: "",
        comentarios: "",
        producto_id: "",
        orden_id: ""
      });
    } catch (error) {
      console.error("Error solicitando devolución:", error);
      alert("Error al solicitar la devolución");
    }
  };

  // Funciones para el modal de opiniones
  const handleAbrirOpinion = (producto: Producto) => {
    setProductoOpinion(producto);
    setOpinionData({
      producto_id: producto.id,
      orden_id: orden?.id || "",
      calificacion: 0,
      comentario: "",
      titulo: ""
    });
    setMostrarModalOpinion(true);
  };

  const handleEnviarOpinion = async () => {
    if (opinionData.calificacion === 0) {
      alert("Por favor selecciona una calificación con estrellas");
      return;
    }

    if (!opinionData.comentario.trim()) {
      alert("Por favor escribe un comentario");
      return;
    }

    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert("Debes estar logueado para enviar una opinión");
        return;
      }

      // Insertar la review en la base de datos
      const { error } = await supabase
        .from("reviews")
        .insert([{
          producto_id: opinionData.producto_id,
          usuario_id: user.id,
          calificacion: opinionData.calificacion,
          comentario: opinionData.comentario,
          creado_en: new Date().toISOString()
        }]);

      if (error) throw error;

      alert("¡Gracias por tu opinión! Tu reseña ha sido publicada.");
      setMostrarModalOpinion(false);
      setProductoOpinion(null);
      setOpinionData({
        producto_id: "",
        orden_id: "",
        calificacion: 0,
        comentario: "",
        titulo: ""
      });
    } catch (error) {
      console.error("Error enviando opinión:", error);
      alert("Error al enviar la opinión");
    }
  };

  // Función para renderizar estrellas interactivas
  const renderStars = (rating: number, onStarClick?: (rating: number) => void, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-2xl ${
              interactive 
                ? 'cursor-pointer hover:scale-110 transition-transform' 
                : 'cursor-default'
            } ${
              star <= (interactive ? hoverRating || rating : rating)
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}
            onClick={() => interactive && onStarClick && onStarClick(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    );
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
            <p className="text-gray-600">Orden no encontrada</p>
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
  const puedeDevolverProductos = puedeDevolver(orden.creado_en);

  // Función auxiliar para verificar si está en devolución
  const estaEnDevolucion = (estado: string) => {
    return estado.toLowerCase().includes('devolucion') || estado.toLowerCase().includes('devolución');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header de confirmación */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Pedido realizado!
              </h1>
              <p className="text-gray-600 mb-4">
                Te enviaremos una confirmación por correo electrónico pronto.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Fecha del pedido</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(orden.creado_en).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-semibold text-gray-900 text-lg">
                      {formatPrice(orden.total)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Enviar a</p>
                    <p className="font-semibold text-gray-900">
                      {orden.direccion?.nombre_completo || "N/A"} ✔
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información del pedido */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Pedido N.º {orden.id.slice(0, 8).toUpperCase()}-{orden.id.slice(8, 16).toUpperCase()}
              </h2>
              <p className="text-sm text-gray-600">
                Realizado el {new Date(orden.creado_en).toLocaleDateString('es-ES')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Estado</p>
              <p className={`font-semibold capitalize ${getEstadoStyles(orden.estado)} px-3 py-1 rounded-full text-xs`}>
                {formatEstadoText(orden.estado)}
              </p>
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-blue-600 border-blue-600"
              onClick={handleVerRecibo}
            >
              <FileText className="w-4 h-4 mr-1" />
              Ver recibo
            </Button>
          </div>
        </div>

        {/* Resumen del pedido */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Resumen del pedido</h2>
          
          <div className="space-y-2 text-sm mb-4">
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

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatPrice(orden.total)}</span>
            </div>
          </div>
        </div>

        {/* Productos del pedido */}
        <div className="space-y-4">
          {orden.items?.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex gap-4 mb-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0">
                  <img
                    src={item.productos?.imagen_url || "/placeholder.png"}
                    alt={item.productos?.titulo}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {item.productos?.titulo}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Vendido por: {item.productos?.vendedor_nombre || "ShopQuilla"}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPrice(item.precio)}
                  </p>
                  <p className="text-sm text-gray-500">Cantidad: {item.cantidad}</p>
                </div>
              </div>

              {/* Información de devolución */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className={`text-sm ${puedeDevolverProductos ? 'text-gray-600' : 'text-red-600'}`}>
                  {puedeDevolverProductos 
                    ? `La ventana de devolución se cierra el ${calcularFechaDevolucion(orden.creado_en)}`
                    : `La ventana de devolución se cerró el ${calcularFechaDevolucion(orden.creado_en)}`
                  }
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600 border-blue-600"
                  onClick={() => handleComprarNuevamente(item.productos)}
                >
                  Comprar nuevamente
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600 border-blue-600"
                  onClick={() => handleVerArticulo(item.productos)}
                >
                  Ver el artículo
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600 border-blue-600"
                  onClick={() => handleAbrirDevolucion(item.productos)}
                  disabled={!puedeDevolverProductos || estaEnDevolucion(orden.estado)}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {estaEnDevolucion(orden.estado) ? 'Devolución en proceso' : 
                   puedeDevolverProductos ? "Solicitar devolución" : "Devolución expirada"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600 border-blue-600"
                  onClick={() => handleAbrirOpinion(item.productos)}
                >
                  <Star className="w-4 h-4 mr-1" />
                  Escribir una opinión
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Dirección de envío */}
        {orden.direccion && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              Dirección de envío
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-gray-900">{orden.direccion.nombre_completo}</p>
                <p className="text-gray-600">{orden.direccion.direccion}</p>
                <p className="text-gray-600">
                  {orden.direccion.ciudad}, {orden.direccion.departamento}
                </p>
                <p className="text-gray-600">{orden.direccion.codigo_postal}</p>
                <p className="text-gray-600">{orden.direccion.pais}</p>
                {orden.direccion.telefono && (
                  <p className="text-gray-600">Tel: {orden.direccion.telefono}</p>
                )}
              </div>
              {orden.direccion.instrucciones_entrega && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Instrucciones de entrega:</p>
                  <p className="text-sm text-gray-600">{orden.direccion.instrucciones_entrega}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones de navegación */}
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/">
            <Button className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-semibold">
              Seguir Comprando
            </Button>
          </Link>
          <Link href="/orders">
            <Button variant="outline" className="border-blue-600 text-blue-600">
              <Package className="w-4 h-4 mr-2" />
              Ver Todas Mis Órdenes
            </Button>
          </Link>
        </div>
      </main>

      {/* Modal para solicitar devolución */}
      {mostrarModalDevolucion && productoDevolucion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                Solicitar Devolución
              </h2>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Producto seleccionado:</h3>
                <p className="text-gray-600">{productoDevolucion.titulo}</p>
                <p className="text-sm text-gray-500">Vendido por: {productoDevolucion.vendedor_nombre}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Motivo de la devolución *</label>
                  <select
                    required
                    value={devolucionData.motivo}
                    onChange={(e) => setDevolucionData({...devolucionData, motivo: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecciona un motivo</option>
                    <option value="producto_defectuoso">Producto defectuoso</option>
                    <option value="no_cumple_esperadas">No cumple con lo esperado</option>
                    <option value="error_pedido">Error en el pedido</option>
                    <option value="cambio_talla">Cambio de talla</option>
                    <option value="arrepentimiento">Arrepentimiento de compra</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Razón específica *</label>
                  <Input
                    required
                    placeholder="Describe brevemente el problema"
                    value={devolucionData.razon}
                    onChange={(e) => setDevolucionData({...devolucionData, razon: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Comentarios adicionales</label>
                  <textarea
                    placeholder="Información adicional que quieras compartir"
                    value={devolucionData.comentarios}
                    onChange={(e) => setDevolucionData({...devolucionData, comentarios: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md h-24 resize-none"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Importante:</strong> La ventana de devolución se cierra el {calcularFechaDevolucion(orden.creado_en)}. 
                    Una vez aprobada, recibirás instrucciones para el envío y el stock será actualizado automáticamente.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleSolicitarDevolucion}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Solicitar Devolución
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarModalDevolucion(false);
                    setProductoDevolucion(null);
                    setDevolucionData({
                      motivo: "",
                      razon: "",
                      comentarios: "",
                      producto_id: "",
                      orden_id: ""
                    });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para escribir opinión */}
      {mostrarModalOpinion && productoOpinion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Escribir Opinión
                </h2>
                <button
                  onClick={() => setMostrarModalOpinion(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Información del producto */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0">
                    <img
                      src={productoOpinion.imagen_url || "/placeholder.png"}
                      alt={productoOpinion.titulo}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {productoOpinion.titulo}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Vendido por: {productoOpinion.vendedor_nombre}
                    </p>
                  </div>
                </div>
              </div>

              {/* Calificación con estrellas */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3 text-gray-900">
                  Califica este producto *
                </label>
                <div className="flex flex-col items-center gap-3">
                  {renderStars(opinionData.calificacion, (rating) => 
                    setOpinionData({...opinionData, calificacion: rating})
                  , true)}
                  <p className="text-sm text-gray-600 text-center">
                    {opinionData.calificacion === 0 
                      ? "Selecciona la cantidad de estrellas"
                      : `Calificación: ${opinionData.calificacion} estrella${opinionData.calificacion !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              </div>
              {/* Comentario */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Tu opinión *
                </label>
                <textarea
                  placeholder="Comparte tu experiencia con este producto..."
                  value={opinionData.comentario}
                  onChange={(e) => setOpinionData({...opinionData, comentario: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 10 caracteres
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <Button
                  onClick={handleEnviarOpinion}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={opinionData.calificacion === 0 || opinionData.comentario.trim().length < 10}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Publicar Opinión
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarModalOpinion(false);
                    setProductoOpinion(null);
                    setOpinionData({
                      producto_id: "",
                      orden_id: "",
                      calificacion: 0,
                      comentario: "",
                      titulo: ""
                    });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}