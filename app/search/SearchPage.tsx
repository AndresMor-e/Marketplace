"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || ""; // parámetro de la URL
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!query) return;

    // Aquí podrías llamar a una API o Supabase, por ejemplo:
    async function fetchResults() {
      try {
        // ejemplo de fake API temporal
        const data = [
          { id: 1, name: "Producto A" },
          { id: 2, name: "Producto B" },
        ];

        setResults(data);
      } catch (error) {
        console.error("Error al obtener resultados:", error);
      }
    }

    fetchResults();
  }, [query]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">
        Resultados de búsqueda
      </h1>

      <p className="text-gray-600 mb-4">
        Buscando: <span className="font-semibold">{query}</span>
      </p>

      {results.length === 0 ? (
        <p className="text-sm text-gray-500">No hay resultados.</p>
      ) : (
        <ul className="space-y-2">
          {results.map((item) => (
            <li key={item.id} className="p-2 border rounded-md">
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
