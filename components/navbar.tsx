"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ShoppingCart, LogOut, LogIn, Settings, Search, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const getUserData = async () => {
      try {
        setError(null);
        console.log("🔄 Obteniendo datos del usuario...");
        
        // 1. Obtener usuario de auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error("❌ Error en auth:", authError);
          throw new Error(`Error de autenticación: ${authError.message}`);
        }

        console.log("✅ Usuario auth:", user?.email);
        
        if (!mounted) return;
        
        setUser(user);
        
        if (!user) {
          setUserRole(null);
          setCartCount(0);
          setLoading(false);
          return;
        }

        // 2. Obtener rol de la tabla usuarios
        console.log("🔍 Buscando rol para:", user.id);
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", user.id)
          .single();

        if (userError) {
          console.error("❌ Error obteniendo rol:", userError);
          
          if (userError.code === '42501') {
            throw new Error("Error de permisos: No tienes acceso a la base de datos. Contacta al administrador.");
          }
          
          if (userError.code === 'PGRST116') {
            console.log("📝 Usuario no encontrado en tabla usuarios, usando metadata...");
            // Usuario existe en auth pero no en usuarios
            const metadataRole = user.user_metadata?.rol;
            if (metadataRole) {
              setUserRole(metadataRole);
            } else {
              // Determinar por email
              if (user.email?.includes('admin')) {
                setUserRole('admin');
              } else if (user.email?.includes('vendedor')) {
                setUserRole('vendedor');
              } else {
                setUserRole('cliente');
              }
            }
          } else {
            throw new Error(`Error de base de datos: ${userError.message}`);
          }
        } else if (userData) {
          console.log("✅ Rol obtenido:", userData.rol);
          setUserRole(userData.rol);
        }

        // 3. Obtener carrito (opcional)
        try {
          const { data: cartData } = await supabase
            .from("cart_items")
            .select("quantity")
            .eq("user_id", user.id);
          
          const total = cartData?.reduce((sum, item) => sum + item.quantity, 0) || 0;
          if (mounted) setCartCount(total);
        } catch (cartError) {
          console.log("🛒 Carrito no disponible:", cartError);
        }

      } catch (error: any) {
        console.error("💥 Error general:", error);
        if (mounted) {
          setError(error.message);
        }
      } finally {
        if (mounted) {
          console.log("🏁 Carga completada");
          setLoading(false);
        }
      }
    };

    getUserData();

    // Suscripción a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Cambio de auth:", event);
      if (!mounted) return;
      
      setError(null); // Limpiar errores en cambio de estado
      
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        getUserData();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole(null);
        setCartCount(0);
        setLoading(false);
      }
    });

    // Timeout de seguridad
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.log("⏰ Timeout de seguridad");
        setLoading(false);
        setError("Tiempo de carga excedido. Recargue la página.");
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // Loading state
  if (loading) {
    return (
      <nav className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">SQ</span>
            </div>
            <div className="h-7 w-32 bg-gray-200 rounded animate-pulse hidden sm:block"></div>
          </div>
          
          <div className="flex-1 max-w-md">
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex gap-2">
              <div className="w-20 h-9 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-24 h-9 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-lg border-b-4 border-blue-500">
      {/* Banner de error */}
      {error && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">SQ</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:inline">
            ShopQuilla
          </span>
        </Link>

        {/* Barra de búsqueda */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>
        {/* Navegación */}
        <div className="flex items-center gap-4">
          {/* Carrito */}
          <Link 
            href="/cart" 
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ShoppingCart className="w-6 h-6 text-gray-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              {/* Info usuario */}
              <div className="flex items-center gap-1">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 hidden sm:inline max-w-45 truncate">
                  {user.email}
                </span>
              </div>

              {/* Botones según rol */}
              {userRole === "admin" && (
                <Link href="/admin/dashboard">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Admin
                  </Button>
                </Link>
              )}

              {userRole === "vendedor" && (
                <Link href="/vendedor/dashboard">
                  <Button variant="outline" size="sm" className="gap-2 bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200gap-2 bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100">
                    <Settings className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
              )}

              {(userRole === "cliente" || !userRole) && (
                <Link href="/orders">
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    Perfil
                  </Button>
                </Link>
              )}

              {/* Logout */}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </Button>
            </div>
          ) : (
            /* No autenticado */
            <div className="flex gap-2">
              <Link href="/auth/login">
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Entrar
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white gap-2"
                >
                  <User className="w-4 h-4" />
                  Registro
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
