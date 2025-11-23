"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Categoria {
  id: string;
  nombre: string;
}

export default function NuevoProducto() {
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    precio: "",
    stock: "",
    categoria_id: "",
    imagen_url: "",
  });

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // 📌 Cargar categorías desde la BD
  useEffect(() => {
    const cargarCategorias = async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nombre");

      if (error) console.error("Error cargando categorías:", error);
      if (data) setCategorias(data);
    };

    cargarCategorias();
  }, []);

  // 📌 Manejo de cambios en inputs
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // 📌 Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Obtener usuario autenticado
      const { data: auth } = await supabase.auth.getUser();

      if (!auth?.user) {
        setError("Debes iniciar sesión primero.");
        return;
      }

      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("id, rol")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (userError || !usuario || usuario.rol !== "vendedor") {
        setError("Tu cuenta no está registrada como vendedor.");
        return;
      }


      const { error: insertError } = await supabase.from("productos").insert([
        {
          vendedor_id: auth.user.id, // 👈 corregido
          categoria_id: formData.categoria_id,
          titulo: formData.titulo,
          descripcion: formData.descripcion || null,
          precio: parseFloat(formData.precio),
          stock: parseInt(formData.stock),
          imagen_url: formData.imagen_url || null,
          estado: "activo",
        },
      ]);


      if (insertError) {
        setError(insertError.message);
        return;
      }

      // 🔄 Redirigir a la lista de productos del vendedor
      router.push("/vendedor/products");
    } catch (err) {
      console.log(err);
      setError("Ocurrió un error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-8 text-gray-900">
        Agregar nuevo producto
      </h2>

      <div className="bg-white rounded-lg shadow p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TÍTULO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del producto
            </label>
            <Input
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Ej: Zapatos deportivos"
              required
              disabled={loading}
            />
          </div>

          {/* CATEGORÍA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <select
              name="categoria_id"
              value={formData.categoria_id}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* DESCRIPCIÓN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={4}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* PRECIO & STOCK */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio
              </label>
              <Input
                type="number"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                placeholder="0"
                required
                step="0.01"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock
              </label>
              <Input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="0"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* IMAGEN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL de imagen
            </label>
            <Input
              type="url"
              name="imagen_url"
              value={formData.imagen_url}
              onChange={handleChange}
              placeholder="https://example.com/imagen.jpg"
              disabled={loading}
            />
            {formData.imagen_url && (
              <div className="mt-4">
                <img
                  src={formData.imagen_url}
                  alt="Preview"
                  className="max-w-xs mx-auto rounded-lg shadow"
                />
              </div>
            )}
          </div>

          {/* BOTONES */}
          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="bg-blue-600 text-white">
              {loading ? "Guardando..." : "Crear producto"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


