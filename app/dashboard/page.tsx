"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
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

      // Redirigir basándose en el rol del usuario
      if (userData?.rol === "admin") {
        router.push("/admin/dashboard");
      } else if (userData?.rol === "vendedor") {
        router.push("/vendedor/dashboard");
      } else if (userData?.rol === "cliente") {
        router.push("/cliente/dashboard");
      }

      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Dashboard del cliente */}
          {userRole === "cliente" && (
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Dashboard del Cliente
              </h2>
              <p className="text-gray-600 mb-6">
                Mira tus pedidos y gestiona tu cuenta.
              </p>
              <Link href="/orders">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  Ver mis pedidos
                </Button>
              </Link>
            </div>
          )}

          {/* Dashboard del vendedor */}
          {userRole === "vendedor" && (
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Dashboard del Vendedor
              </h2>
              <p className="text-gray-600 mb-6">
                Administra tus productos y pedidos.
              </p>
              <Link href="/vendedor/dashboard">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  Ir al Dashboard del vendedor
                </Button>
              </Link>
            </div>
          )}

          {/* Dashboard admin */}
          {userRole === "admin" && (
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Dashboard de Administrador
              </h2>
              <p className="text-gray-600 mb-6">
                Gestiona toda la plataforma.
              </p>
              <Link href="/admin/dashboard">
                <Button className="bg-red-600 text-white">
                  Panel Administrativo
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}



