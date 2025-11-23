"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUser(user);

      // Consulta correcta
      const { data: userData, error } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .single();

      console.log("Rol encontrado:", userData?.rol);

      if (error) {
        console.error("Error leyendo rol:", error);
      }

      if (userData) {
        setUserRole(userData.rol); // cliente | vendedor | admin
      }

      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navbar ya está en el layout, no lo repetimos aquí */}
        <div className="flex items-center justify-center py-24">
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar ya está en el layout, no lo repetimos aquí */}

      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Dashboard admin */}
          {userRole === "admin" && (
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Crear categoría de producto
              </h2>
              <Link href="/admin/dashboard/create_category">
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                  Crear nueva categoría
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}