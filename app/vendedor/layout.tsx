"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Package, BarChart3, Settings, LogOut } from "lucide-react";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login"); // No autenticado → login
        return;
      }

      // Verificar rol en tabla usuarios
      const { data: userData } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (userData?.rol !== "vendedor") {
        router.push("/"); // Si no es vendedor → inicio
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <Link
            href="/"
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            Vendedor de ShopQuilla
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {/* DASHBOARD */}
          <Link
            href="/vendedor/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg transition"
          >
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </Link>

          {/* PRODUCTS */}
          <Link
            href="/vendedor/products"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg transition"
          >
            <Package className="w-5 h-5" />
            Productos
          </Link>

          {/* SETTINGS */}
          <Link
            href="/vendedor/settings"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg transition"
          >
            <Settings className="w-5 h-5" />
            Configuracion de tienda
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow">
          <div className="px-8 py-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard del vendedor
            </h1>
            <p className="text-gray-600 mt-1">{user?.email}</p>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}


