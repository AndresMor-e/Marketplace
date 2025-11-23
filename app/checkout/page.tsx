"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { Edit, Plus, MapPin, Home, Building, Check, CreditCard, ShoppingCart } from "lucide-react";

interface Producto {
  id: string;
  titulo: string;
  precio: number;
  imagen_url: string;
  vendedor_nombre: string;
}

interface ItemCarrito {
  id: string;
  cantidad: number;
  productos: Producto;
}

interface Direccion {
  id: string;
  nombre_completo: string;
  telefono: string;
  direccion: string;
  departamento: string;
  ciudad: string;
  codigo_postal: string;
  pais: string;
  es_principal: boolean;
  instrucciones_entrega?: string;
  referencia?: string;
  es_casa: boolean;
  alias?: string;
}

type FormDireccion = {
  nombre_completo: string;
  telefono: string;
  direccion: string;
  departamento: string;
  ciudad: string;
  codigo_postal: string;
  pais: string;
  instrucciones_entrega: string;
  referencia: string;
  es_casa: boolean;
  alias: string;
};

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<ItemCarrito[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<Direccion | null>(null);
  const [mostrarFormDireccion, setMostrarFormDireccion] = useState(false);
  const [editandoDireccion, setEditandoDireccion] = useState<Direccion | null>(null);
  
  const [formDireccion, setFormDireccion] = useState<FormDireccion>({
    nombre_completo: "",
    telefono: "",
    direccion: "",
    departamento: "",
    ciudad: "",
    codigo_postal: "",
    pais: "Colombia",
    instrucciones_entrega: "",
    referencia: "",
    es_casa: true,
    alias: ""
  });

  const router = useRouter();
  const supabase = createClient();

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/auth/login");

      setUser(userData.user);

      // Verificar si hay un producto para agregar desde localStorage (comprar nuevamente)
      const productoId = localStorage.getItem('productoComprarNuevamente');
      if (productoId) {
        console.log("Agregando producto desde localStorage:", productoId);
        await agregarProductoAlCarrito(userData.user.id, productoId);
        localStorage.removeItem('productoComprarNuevamente');
      }

      // Obtener carrito actualizado
      await fetchCarrito(userData.user.id);

      // Obtener direcciones
      await fetchDirecciones(userData.user.id);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const fetchCarrito = async (userId: string) => {
    try {
      // CORREGIDO: Usar "carrito" en lugar de "cart_items"
      const { data: items, error } = await supabase
        .from("carrito")
        .select("*, productos(*)")
        .eq("usuario_id", userId);

      if (error) {
        console.error("Error fetching cart:", error);
        return;
      }

      if (items) {
        setCartItems(items as ItemCarrito[]);
        console.log("Carrito actualizado:", items);
      }
    } catch (error) {
      console.error("Error en fetchCarrito:", error);
    }
  };

  const agregarProductoAlCarrito = async (userId: string, productoId: string) => {
    try {
      console.log("Agregando producto al carrito:", productoId);
      
      // Verificar si el producto existe
      const { data: producto, error: productoError } = await supabase
        .from("productos")
        .select("*")
        .eq("id", productoId)
        .single();

      if (productoError || !producto) {
        console.error("Producto no encontrado:", productoError);
        return;
      }

      // Buscar si el producto ya está en el carrito
      // CORREGIDO: Usar "carrito" en lugar de "cart_items"
      const { data: existingItem, error: searchError } = await supabase
        .from("carrito")
        .select("*")
        .eq("usuario_id", userId)
        .eq("producto_id", productoId)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error("Error buscando producto:", searchError);
        return;
      }

      if (existingItem) {
        // Si ya existe, actualizar la cantidad
        // CORREGIDO: Usar "carrito" en lugar de "cart_items"
        const { error: updateError } = await supabase
          .from("carrito")
          .update({ cantidad: existingItem.cantidad + 1 })
          .eq("id", existingItem.id);

        if (updateError) {
          console.error("Error actualizando producto:", updateError);
          return;
        }
        console.log("Producto actualizado en carrito");
      } else {
        // Si no existe, crear nuevo item
        // CORREGIDO: Usar "carrito" en lugar de "cart_items"
        const { error: insertError } = await supabase
          .from("carrito")
          .insert({
            usuario_id: userId,
            producto_id: productoId,
            cantidad: 1
          });

        if (insertError) {
          console.error("Error insertando producto:", insertError);
          return;
        }
        console.log("Producto agregado al carrito");
      }

      // Recargar el carrito
      await fetchCarrito(userId);
      
    } catch (error) {
      console.error("Error agregando producto al carrito:", error);
    }
  };

  const fetchDirecciones = async (userId: string) => {
    const { data: direccionesData } = await supabase
      .from("direcciones")
      .select("*")
      .eq("usuario_id", userId)
      .order("es_principal", { ascending: false });

    if (direccionesData && direccionesData.length > 0) {
      setDirecciones(direccionesData);
      setDireccionSeleccionada(direccionesData.find(d => d.es_principal) || direccionesData[0]);
    }
  };

  const direccionToForm = (direccion: Direccion): FormDireccion => ({
    nombre_completo: direccion.nombre_completo || "",
    telefono: direccion.telefono || "",
    direccion: direccion.direccion || "",
    departamento: direccion.departamento || "",
    ciudad: direccion.ciudad || "",
    codigo_postal: direccion.codigo_postal || "",
    pais: direccion.pais || "Colombia",
    instrucciones_entrega: direccion.instrucciones_entrega || "",
    referencia: direccion.referencia || "",
    es_casa: direccion.es_casa ?? true,
    alias: direccion.alias || ""
  });

  const handleSaveDireccion = async () => {
    if (!user) return;

    const direccionData = {
      ...formDireccion,
      usuario_id: user.id,
      es_principal: direcciones.length === 0
    };

    const { error } = await supabase
      .from("direcciones")
      .insert([direccionData]);

    if (!error) {
      await fetchDirecciones(user.id);
      setMostrarFormDireccion(false);
      resetFormDireccion();
    }
  };

  const handleUpdateDireccion = async () => {
    if (!editandoDireccion) return;

    const { error } = await supabase
      .from("direcciones")
      .update(formDireccion)
      .eq("id", editandoDireccion.id);

    if (!error) {
      await fetchDirecciones(user.id);
      setEditandoDireccion(null);
      resetFormDireccion();
    }
  };

  const setDireccionPrincipal = async (direccionId: string) => {
    await supabase
      .from("direcciones")
      .update({ es_principal: false })
      .eq("usuario_id", user.id);

    const { error } = await supabase
      .from("direcciones")
      .update({ es_principal: true })
      .eq("id", direccionId);

    if (!error) {
      await fetchDirecciones(user.id);
    }
  };

  const resetFormDireccion = () => {
    setFormDireccion({
      nombre_completo: "",
      telefono: "",
      direccion: "",
      departamento: "",
      ciudad: "",
      codigo_postal: "",
      pais: "Colombia",
      instrucciones_entrega: "",
      referencia: "",
      es_casa: true,
      alias: ""
    });
  };

  const calcularSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.cantidad * item.productos.precio, 0);
  };

  const calcularEnvio = () => {
    return 0;
  };

  const calcularImpuestos = () => {
    return calcularSubtotal() * 0.10;
  };

  const calcularTotal = () => {
    return calcularSubtotal() + calcularEnvio() + calcularImpuestos();
  };

  const handleCheckout = async () => {
    if (!direccionSeleccionada) {
      alert("Por favor selecciona una dirección de envío");
      return;
    }

    setProcessing(true);
    try {
      const total = calcularTotal();

      const { data: orden, error: ordenError } = await supabase
        .from("ordenes")
        .insert({
          usuario_id: user.id,
          total,
          estado: "pendiente",
          direccion_id: direccionSeleccionada.id,
        })
        .select()
        .single();

      if (ordenError) throw ordenError;

      const detallesOrden = cartItems.map(item => ({
        orden_id: orden.id,
        producto_id: item.productos.id,
        cantidad: item.cantidad,
        precio: item.productos.precio * item.cantidad
      }));

      const { error: detallesError } = await supabase
        .from("detalles_orden")
        .insert(detallesOrden);

      if (detallesError) throw detallesError;

      // CORREGIDO: Usar "carrito" en lugar de "cart_items"
      const { error: deleteError } = await supabase
        .from("carrito")
        .delete()
        .eq("usuario_id", user.id);

      if (deleteError) throw deleteError;

      router.push(`/order/${orden.id}`);

    } catch (error) {
      console.error("Error en checkout:", error);
      alert("Hubo un error procesando tu compra. Por favor intenta de nuevo.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSeguirComprando = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Cargando tu carrito...</p>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h2>
            <p className="text-gray-600 mb-6">
              No hay productos en tu carrito de compras.
            </p>
            <Button 
              onClick={handleSeguirComprando}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Seguir comprando
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const subtotal = calcularSubtotal();
  const envio = calcularEnvio();
  const impuestos = calcularImpuestos();
  const total = calcularTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600 mt-2">
              Revisa y confirma tu pedido ({cartItems.length} producto{cartItems.length !== 1 ? 's' : ''})
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Dirección de envío
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFormDireccion(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar dirección
                </Button>
              </div>

              {direccionSeleccionada ? (
                <div className="border border-green-500 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Principal
                        </span>
                        <span className="text-sm text-gray-600">
                          {direccionSeleccionada.alias || (direccionSeleccionada.es_casa ? "Casa" : "Oficina")}
                        </span>
                      </div>
                      <p className="font-semibold">{direccionSeleccionada.nombre_completo}</p>
                      <p className="text-gray-600">{direccionSeleccionada.direccion}</p>
                      <p className="text-gray-600">
                        {direccionSeleccionada.ciudad}, {direccionSeleccionada.departamento}
                      </p>
                      <p className="text-gray-600">{direccionSeleccionada.codigo_postal}</p>
                      <p className="text-gray-600">Tel: {direccionSeleccionada.telefono}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditandoDireccion(direccionSeleccionada);
                        setFormDireccion(direccionToForm(direccionSeleccionada));
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No hay direcciones guardadas</p>
                  <Button onClick={() => setMostrarFormDireccion(true)}>
                    Agregar primera dirección
                  </Button>
                </div>
              )}

              {direcciones.filter(d => d.id !== direccionSeleccionada?.id).length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Otras direcciones guardadas</h3>
                  <div className="space-y-3">
                    {direcciones.filter(d => d.id !== direccionSeleccionada?.id).map((direccion) => (
                      <div key={direccion.id} className="border rounded-lg p-4 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {direccion.es_casa ? (
                              <Home className="w-4 h-4 text-gray-500" />
                            ) : (
                              <Building className="w-4 h-4 text-gray-500" />
                            )}
                            <span className="text-sm text-gray-600">
                              {direccion.alias || (direccion.es_casa ? "Casa" : "Oficina")}
                            </span>
                          </div>
                          <p className="font-semibold">{direccion.nombre_completo}</p>
                          <p className="text-gray-600 text-sm">{direccion.direccion}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDireccionPrincipal(direccion.id)}
                          >
                            Usar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditandoDireccion(direccion);
                              setFormDireccion(direccionToForm(direccion));
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Método de pago
              </h2>
              <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-semibold">Pago contra entrega</p>
                    <p className="text-sm text-gray-600">Paga cuando recibas tu pedido</p>
                  </div>
                  <Check className="w-5 h-5 text-green-600 ml-auto" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Items en tu pedido</h2>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={`${item.productos.id}-${item.id}`} className="flex gap-4 py-4 border-b last:border-b-0">
                    <div className="relative w-20 h-20 bg-gray-100 rounded-lg">
                      <Image
                        src={item.productos.imagen_url || "/placeholder.png"}
                        alt={item.productos.titulo}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.productos.titulo}</h3>
                      <p className="text-sm text-gray-600">Vendido por: {item.productos.vendedor_nombre}</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(item.productos.precio)}
                      </p>
                      <p className="text-sm text-gray-600">Cantidad: {item.cantidad}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(item.productos.precio * item.cantidad)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit sticky top-4">
            <Button
              disabled={processing || !direccionSeleccionada}
              onClick={handleCheckout}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-3 font-bold text-lg mb-4"
            >
              {processing ? "Procesando..." : "Realizar pedido"}
            </Button>

            <div className="text-xs text-gray-600 mb-4 text-center">
              Al realizar el pedido, aceptas los términos y condiciones de ShopQuilla
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold mb-3">Resumen del pedido</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal ({cartItems.length} productos):</span>
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
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-semibold text-blue-900">Llega el {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO')}</p>
              <p className="text-sm text-blue-700">Envío estándar GRATIS</p>
            </div>

            <div className="mt-4">
              <Button
                onClick={handleSeguirComprando}
                variant="outline"
                className="w-full"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Seguir comprando
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal para agregar/editar dirección */}
      {(mostrarFormDireccion || editandoDireccion) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editandoDireccion ? "Editar dirección" : "Agregar nueva dirección"}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Alias (opcional)</label>
                  <Input
                    placeholder="Ej: Casa, Oficina"
                    value={formDireccion.alias}
                    onChange={(e) => setFormDireccion({...formDireccion, alias: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Nombre completo *</label>
                  <Input
                    required
                    value={formDireccion.nombre_completo}
                    onChange={(e) => setFormDireccion({...formDireccion, nombre_completo: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Teléfono *</label>
                  <Input
                    required
                    value={formDireccion.telefono}
                    onChange={(e) => setFormDireccion({...formDireccion, telefono: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Dirección *</label>
                  <Input
                    required
                    value={formDireccion.direccion}
                    onChange={(e) => setFormDireccion({...formDireccion, direccion: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ciudad *</label>
                    <Input
                      required
                      value={formDireccion.ciudad}
                      onChange={(e) => setFormDireccion({...formDireccion, ciudad: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Departamento *</label>
                    <Input
                      required
                      value={formDireccion.departamento}
                      onChange={(e) => setFormDireccion({...formDireccion, departamento: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Código postal</label>
                  <Input
                    value={formDireccion.codigo_postal}
                    onChange={(e) => setFormDireccion({...formDireccion, codigo_postal: e.target.value})}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formDireccion.es_casa}
                    onChange={(e) => setFormDireccion({...formDireccion, es_casa: e.target.checked})}
                  />
                  <label className="text-sm">Es una casa (desmarca si es oficina)</label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Instrucciones de entrega (opcional)</label>
                  <Input
                    placeholder="Ej: Timbre 2 veces, Casa verde"
                    value={formDireccion.instrucciones_entrega}
                    onChange={(e) => setFormDireccion({...formDireccion, instrucciones_entrega: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={editandoDireccion ? handleUpdateDireccion : handleSaveDireccion}
                  className="flex-1"
                >
                  {editandoDireccion ? "Actualizar dirección" : "Guardar dirección"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarFormDireccion(false);
                    setEditandoDireccion(null);
                    resetFormDireccion();
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