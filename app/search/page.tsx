"use client";

import { Suspense } from "react";
import SearchPage from "./SearchPage";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <p className="text-center text-gray-600 text-lg">
            Cargando búsqueda...
          </p>
        </div>
      </div>
    }>
      <SearchPage />
    </Suspense>
  );
}

