import Navbar from "@/components/navbar";

export const metadata = {
  title: "Panel Administrativo",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar visible en todo el panel */}
      <Navbar />

      {/* Contenido del panel */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {children}
      </main>
    </div>
  );
}
