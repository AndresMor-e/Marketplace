"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [userType, setUserType] = useState<"cliente" | "vendedor">("cliente");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("INICIANDO REGISTRO...");

      // PASO 1: Registro en Auth con metadata
      console.log("Paso 1: Creando usuario en Auth con metadata...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            nombre: name.trim(),
            rol: userType // ← Esto se pasa al trigger
          }
        }
      });

      console.log("Auth Data:", authData);
      console.log("Auth Error:", authError);

      if (authError) {
        setError(`Error de autenticación: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        setError("No se pudo crear el usuario en Auth");
        return;
      }

      console.log("REGISTRO COMPLETADO EXITOSAMENTE!");
      
      // Éxito - mostrar mensaje y redirigir
      setError("✅ ¡Cuenta creada exitosamente! Revisa tu email para confirmar.");
      
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);

    } catch (err: any) {
      console.error("ERROR GENERAL:", err);
      setError(`Error inesperado: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          Únete a ShopQuilla
        </h1>

        {error && (
          <div className={`mb-4 p-3 rounded text-sm ${
            error.includes('✅') 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {error}
            {error.includes('✅') && (
              <div className="mt-2 text-xs">
                Serás redirigido automáticamente...
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre completo
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Soy un...
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="cliente"
                  checked={userType === "cliente"}
                  onChange={(e) => setUserType(e.target.value as "cliente" | "vendedor")}
                  className="mr-2"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700">Comprador</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  value="vendedor"
                  checked={userType === "vendedor"}
                  onChange={(e) => setUserType(e.target.value as "cliente" | "vendedor")}
                  className="mr-2"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700">Vendedor</span>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          ¿Ya tienes una?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}