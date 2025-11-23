"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VendorSettings {
  nombre_tienda: string;
  descripcion: string;
  logo_url: string;
}

export default function VendorSettings() {
  const [settings, setSettings] = useState<VendorSettings>({
    nombre_tienda: "",
    descripcion: "",
    logo_url: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError("No estás logueado");
          setLoading(false);
          return;
        }

        // Intentar obtener la tienda del vendedor
        const { data, error: fetchError } = await supabase
          .from("tiendas")
          .select("nombre_tienda, descripcion, logo_url")
          .eq("vendedor_id", user.id)
          .single();

        if (fetchError) {
          // En caso de que haya un error al obtener la tienda
          setError("Error al cargar la tienda: " + fetchError.message);
          setLoading(false);
          return;
        }

        // Si la tienda existe, actualizar el estado con los datos
        if (data) {
          setSettings({
            nombre_tienda: data.nombre_tienda ?? "",
            descripcion: data.descripcion ?? "",
            logo_url: data.logo_url ?? "",
          });
        }

        setLoading(false);

      } catch (err) {
        // Manejar cualquier error inesperado
        console.error("Error al cargar la tienda:", err);
        setError("Error inesperado al cargar la tienda.");
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("Debes iniciar sesión.");
        setSaving(false);
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from("usuarios")
        .select("id, rol")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError("Error al obtener el perfil de usuario.");
        console.error("Error en la consulta de usuario:", profileError);
        setSaving(false);
        return;
      }

      if (userProfile?.rol !== "vendedor") {
        setError("No tienes permiso para acceder a esta sección.");
        setSaving(false);
        return;
      }

      // Verificar si la tienda ya existe
      const { data: tiendaExistente, error: tiendaError } = await supabase
        .from("tiendas")
        .select("vendedor_id")
        .eq("vendedor_id", userProfile.id)
        .single();

      if (tiendaError && tiendaError.code !== 'PGRST116') {
        // PGRST116 es el error cuando no se encuentra ningún registro, lo cual es normal
        setError("Error al verificar la tienda: " + tiendaError.message);
        console.error("Error al verificar la tienda:", tiendaError);
        setSaving(false);
        return;
      }

      if (!tiendaExistente) {
        // Si no existe la tienda, la creamos
        const { error: insertError } = await supabase
          .from("tiendas")
          .insert([
            {
              vendedor_id: userProfile.id,
              nombre_tienda: settings.nombre_tienda,
              descripcion: settings.descripcion,
              logo_url: settings.logo_url,
            },
          ]);

        if (insertError) {
          setError("Error al crear la tienda: " + insertError.message);
          console.error("Error al crear la tienda:", insertError);
        } else {
          alert("Tienda creada y configuración guardada correctamente.");
          // CORREGIDO: Redirigir a la ruta correcta
          window.location.href = "/vendedor/dashboard";
        }
      } else {
        // Si la tienda ya existe, actualizamos los datos
        const { error: updateError } = await supabase
          .from("tiendas")
          .update({
            nombre_tienda: settings.nombre_tienda,
            descripcion: settings.descripcion,
            logo_url: settings.logo_url,
          })
          .eq("vendedor_id", userProfile.id);

        if (updateError) {
          setError("Error al guardar la configuración: " + updateError.message);
          console.error("Error al actualizar la tienda:", updateError);
        } else {
          alert("Configuración guardada correctamente.");
          // CORREGIDO: Redirigir a la ruta correcta
          window.location.href = "/vendedor/dashboard";
        }
      }
    } catch (err) {
      setError("Error desconocido al guardar la configuración.");
      console.error("Error desconocido:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-8 text-gray-900">Configuración de la tienda</h2>

      <div className="bg-white rounded-lg shadow p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Nombre de la tienda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la tienda
            </label>
            <Input
              type="text"
              name="nombre_tienda"
              value={settings.nombre_tienda}
              onChange={handleChange}
              placeholder="Ej: Tienda Artesanal"
              required
              disabled={saving}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción de la tienda
            </label>
            <textarea
              name="descripcion"
              value={settings.descripcion}
              onChange={handleChange}
              placeholder="Describe tu tienda..."
              rows={6}
              disabled={saving}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL del logo
            </label>
            <Input
              type="url"
              name="logo_url"
              value={settings.logo_url}
              onChange={handleChange}
              placeholder="https://tutienda.com/logo.png"
              disabled={saving}
            />
            {/* Mostrar el logo si se ha proporcionado una URL válida */}
            {settings.logo_url && (
              <div className="mt-4">
                <img
                  src={settings.logo_url}
                  alt="Logo de la tienda"
                  className="max-w-xs mx-auto"
                />
              </div>
            )}
          </div>

          {/* Botón para guardar */}
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            {saving ? "Guardando..." : "Guardar configuración"}
          </Button>
        </form>
      </div>
    </div>
  );
}

