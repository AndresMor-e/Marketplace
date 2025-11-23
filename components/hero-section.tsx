"use client";

export default function HeroSection() {
  return (
    <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl p-12 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition">
          <span className="text-5xl">🛍️</span>
        </div>
      </div>
      <h1 className="text-5xl font-bold mb-4">ShopQuilla</h1>
      <p className="text-xl mb-8 opacity-90">
        Descubre millones de productos de vendedores de confianza.
      </p>
      <button className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-full text-lg transition">
        Compra ahora
      </button>
    </div>
  );
}
