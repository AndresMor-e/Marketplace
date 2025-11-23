"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Edit, Trash2, Image as ImageIcon } from "lucide-react";

interface Producto {
  id: string;
  titulo: string;
  precio: number | null;
  stock: number | null;
  categoria_id: string;
  descripcion: string | null;
  estado: string;
  creado_en: string;
  imagen_url: string | null;
}

export default function ProductosVendedor() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      console.log("Iniciando carga de productos...");

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error obteniendo usuario:", userError);
        setLoading(false);
        return;
      }

      if (!user) {
        console.log("No hay usuario autenticado");
        setLoading(false);
        return;
      }

      console.log("Usuario autenticado:", user.email);
      console.log("ID del usuario:", user.id);

      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("vendedor_id", user.id)
        .order("creado_en", { ascending: false });

      console.log("Error en consulta:", error);
      console.log("Productos encontrados:", data);

      if (error) {
        console.error("Error cargando productos:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setProductos(data);
        console.log(`${data.length} productos cargados correctamente`);
      } else {
        setProductos([]);
        console.log("No se encontraron productos");
      }

    } catch (error) {
      console.error("Error inesperado:", error);
    } finally {
      setLoading(false);
    }
  };

  const eliminarProducto = async (productoId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este producto?")) return;

    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("id", productoId);

    if (!error) {
      setProductos(productos.filter((p) => p.id !== productoId));
      alert("Producto eliminado correctamente");
    } else {
      console.error("Error eliminando producto:", error);
      alert("Error al eliminar el producto");
    }
  };

  if (!mounted) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-lg">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Tus productos</h2>
        <Link href="/vendedor/products/new">
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </Button>
        </Link>
      </div>

      {productos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Aún no tienes productos.</p>
          <Link href="/vendedor/products/new">
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
              Crear mi primer producto
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Producto
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Precio
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Stock
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productos.map((producto) => (
                <tr key={producto.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Imagen del producto */}
                      <div className="flex-shrink-0">
                        {producto.imagen_url ? (
                          <img
                            src={producto.imagen_url}
                            alt={producto.titulo}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              // Si la imagen falla al cargar, mostrar un placeholder
                              (e.target as HTMLImageElement).style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        {/* Placeholder que se muestra si la imagen falla */}
                        {producto.imagen_url && (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center hidden">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Información del producto */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {producto.titulo}
                        </div>
                        {producto.descripcion && (
                          <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {producto.descripcion}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {producto.precio ? `$${producto.precio.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {producto.stock ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      producto.estado === 'activo' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {producto.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <Link href={`/vendedor/products/edit/${producto.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Edit className="w-4 h-4" />
                        Editar
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => eliminarProducto(producto.id)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Borrar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}