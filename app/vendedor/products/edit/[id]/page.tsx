"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface Categoria {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  titulo: string;
  descripcion: string | null;
  precio: number | null;
  stock: number | null;
  categoria_id: string;
  estado: string;
  imagen_url: string | null;
  vendedor_id: string;
  creado_en?: string;
}

export default function EditarProductoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [producto, setProducto] = useState<Producto | null>(null);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    precio: "",
    stock: "",
    categoria_id: "",
    estado: "activo",
    imagen_url: ""
  });

  const router = useRouter();
  const params = useParams();
  const productoId = params.id as string;
  const supabase = createClient();

  useEffect(() => {
    cargarDatos();
  }, [productoId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      console.log("🔄 Cargando datos para producto:", productoId);

      // Cargar categorías
      const { data: categoriasData, error: catError } = await supabase
        .from("categorias")
        .select("id, nombre")
        .order("nombre");

      if (catError) {
        console.error("❌ Error cargando categorías:", catError);
      } else {
        setCategorias(categoriasData || []);
        console.log("✅ Categorías cargadas:", categoriasData?.length);
      }

      // Cargar producto
      const { data: productoData, error } = await supabase
        .from("productos")
        .select("*")
        .eq("id", productoId)
        .single();

      console.log("📦 Producto cargado:", productoData);
      console.log("❌ Error cargando producto:", error);

      if (error) {
        console.error("Error cargando producto:", error);
        alert("Producto no encontrado");
        router.push("/vendedor/products");
        return;
      }

      if (productoData) {
        setProducto(productoData);
        setFormData({
          titulo: productoData.titulo || "",
          descripcion: productoData.descripcion || "",
          precio: productoData.precio?.toString() || "",
          stock: productoData.stock?.toString() || "",
          categoria_id: productoData.categoria_id || "",
          estado: productoData.estado || "activo",
          imagen_url: productoData.imagen_url || ""
        });
        console.log("✅ Formulario inicializado con datos del producto");
      }

    } catch (error) {
      console.error("💥 Error cargando datos:", error);
      alert("Error cargando los datos del producto");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!producto) {
      alert("Producto no encontrado");
      return;
    }

    try {
      setSaving(true);
      console.log("🔄 Iniciando actualización...");
      console.log("📝 Datos del formulario:", formData);

      // Validaciones básicas
      if (!formData.titulo.trim()) {
        alert("El título es requerido");
        setSaving(false);
        return;
      }

      if (!formData.precio || parseFloat(formData.precio) <= 0) {
        alert("El precio debe ser mayor a 0");
        setSaving(false);
        return;
      }

      // Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert("Error de autenticación. Por favor, inicia sesión nuevamente.");
        setSaving(false);
        return;
      }

      console.log("👤 Usuario autenticado:", user.id);

      // Verificar que el usuario es el dueño del producto
      const { data: productoVerificado, error: verifyError } = await supabase
        .from("productos")
        .select("vendedor_id")
        .eq("id", productoId)
        .single();

      if (verifyError || !productoVerificado) {
        alert("Producto no encontrado o error de verificación");
        setSaving(false);
        return;
      }

      console.log("🔍 Vendedor del producto:", productoVerificado.vendedor_id);
      console.log("🔍 Usuario actual:", user.id);

      if (productoVerificado.vendedor_id !== user.id) {
        alert("No tienes permisos para editar este producto");
        setSaving(false);
        return;
      }

      // Preparar datos para actualizar (SIN actualizado_en)
      const updates = {
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim() || null,
        precio: formData.precio ? parseFloat(formData.precio) : null,
        stock: formData.stock ? parseInt(formData.stock) : null,
        categoria_id: formData.categoria_id || null,
        estado: formData.estado,
        imagen_url: formData.imagen_url.trim() || null
        // Se eliminó: actualizado_en: new Date().toISOString()
      };

      console.log("📦 Datos a actualizar:", updates);

      // Realizar el update
      const { data, error: updateError } = await supabase
        .from("productos")
        .update(updates)
        .eq("id", productoId)
        .eq("vendedor_id", user.id) // Doble verificación de seguridad
        .select();

      console.log("✅ Respuesta de update:", data);
      console.log("❌ Error de update:", updateError);

      if (updateError) {
        console.error("Error detallado:", updateError);
        
        if (updateError.code === '42501') {
          alert("Error de permisos: No tienes permisos para actualizar este producto. Verifica las políticas RLS.");
        } else if (updateError.code === '23505') {
          alert("Error: Ya existe un producto con estos datos.");
        } else {
          alert(`Error al actualizar el producto: ${updateError.message}`);
        }
        setSaving(false);
        return;
      }

      console.log("🎉 Producto actualizado correctamente");
      alert("✅ Producto actualizado correctamente");
      router.push("/vendedor/products");
      router.refresh(); // Forzar actualización de la cache

    } catch (error: any) {
      console.error("💥 Error inesperado:", error);
      alert(`❌ Error inesperado: ${error.message || "Por favor intenta nuevamente"}`);
    } finally {
      setSaving(false);
    }
  };

  // Función temporal para probar la conexión
  const testUpdate = async () => {
    try {
      console.log("🧪 Ejecutando test de actualización...");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("No hay usuario autenticado");
        return;
      }

      // Update simple de prueba (SIN actualizado_en)
      const { error } = await supabase
        .from("productos")
        .update({ titulo: "TEST " + new Date().toLocaleTimeString() })
        .eq("id", productoId)
        .eq("vendedor_id", user.id);

      console.log("🧪 Test update error:", error);
      
      if (!error) {
        alert("✅ Test exitoso - Los permisos están bien");
        cargarDatos(); // Recargar datos
      } else {
        alert(`❌ Test fallido: ${error.message}`);
      }
    } catch (error) {
      console.error("🧪 Test error:", error);
      alert("❌ Error en test");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Cargando producto...</div>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">Producto no encontrado</p>
        <Link href="/vendedor/products">
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            Volver a productos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/vendedor/products">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Producto</h1>
            <p className="text-gray-600">Actualiza la información de tu producto</p>
          </div>
        </div>
      </div>
      
      {/* Formulario */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Título */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
              Título del Producto *
            </label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Zapatillas Deportivas Nike"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe tu producto..."
            />
          </div>

          {/* Precio y Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-2">
                Precio *
              </label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                Stock
              </label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Cantidad disponible"
              />
            </div>
          </div>

          {/* Categoría y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                id="categoria_id"
                name="categoria_id"
                value={formData.categoria_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="agotado">Agotado</option>
              </select>
            </div>
          </div>

          {/* URL de Imagen */}
          <div>
            <label htmlFor="imagen_url" className="block text-sm font-medium text-gray-700 mb-2">
              URL de la Imagen
            </label>
            <input
              type="url"
              id="imagen_url"
              name="imagen_url"
              value={formData.imagen_url}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://ejemplo.com/imagen.jpg"
            />
            {formData.imagen_url && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
                <img 
                  src={formData.imagen_url} 
                  alt="Vista previa" 
                  className="h-32 object-cover rounded border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <Link href="/vendedor/products" className="flex-1">
              <Button type="button" variant="outline" className="w-full" disabled={saving}>
                Cancelar
              </Button>
            </Link>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white gap-2"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}