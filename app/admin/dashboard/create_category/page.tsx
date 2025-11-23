"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CreateCategory() {
  const [category, setCategory] = useState({
    nombre: "",
    descripcion: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCategory({
      ...category,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("categorias")
        .insert([
          {
            nombre: category.nombre,
            descripcion: category.descripcion,
          },
        ]);

      if (error) {
        setError("Error al crear la categoría");
        console.error(error);
      } else {
        alert("Categoría creada correctamente");
        router.push("/admin/dashboard");
      }
    } catch (err) {
      setError("Error desconocido al crear la categoría");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-8">Crear nueva categoría</h2>

      <div className="bg-white rounded-lg shadow p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <Input
              type="text"
              name="nombre"
              value={category.nombre}
              onChange={handleChange}
              placeholder="Ej: Ropa"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <Textarea
              name="descripcion"
              value={category.descripcion}
              onChange={handleChange}
              placeholder="Descripción de la categoría..."
              rows={6}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Guardando..." : "Crear Categoría"}
          </Button>
        </form>
      </div>
    </div>
  );
}

