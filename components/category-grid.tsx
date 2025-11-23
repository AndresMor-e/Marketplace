"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url: string;
  description: string;
}

export default function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("categories").select("*");

      if (!error && data) {
        setCategories(data);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Cargando categorias...</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}`}
          className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-gray-100 transition"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
            <Image
              src={category.icon_url || "/placeholder.svg"}
              alt={category.name}
              width={32}
              height={32}
            />
          </div>
          <span className="text-sm font-medium text-center text-gray-800">
            {category.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
