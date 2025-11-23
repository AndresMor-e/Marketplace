"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ShoppingCart, Star, User, Send, CheckCircle, Store } from "lucide-react";
import Link from "next/link";

interface Review {
  id: string;
  calificacion: number;
  comentario: string;
  creado_en: string;
  usuario_id: string;
  usuarios?: {
    email: string;
  } | null;
}

interface Product {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
  imagen_url: string;
  stock: number;
  vendedor_id: string; // ← Agregamos el vendedor_id directamente del producto
  vendedor: {
    id: string;
    nombre: string;
  } | null;
  rating: number;
  total_reviews: number;
}

interface Tienda {
  id: string;
  nombre_tienda: string;
  vendedor_id: string;
}

// Función para formatear el precio
const formatPrice = (price: number | string) => {
  try {
    let priceNumber: number;
    
    if (typeof price === 'string') {
      const cleanString = price.toString().replace(/[^\d.,]/g, '');
      priceNumber = parseFloat(cleanString.replace(',', '.'));
    } else {
      priceNumber = price;
    }
    
    if (isNaN(priceNumber)) {
      console.warn(`Precio inválido: ${price}`);
      return `$${price}`;
    }
    
    return `$${priceNumber.toLocaleString('es-CO')}`;
    
  } catch (error) {
    console.error('Error formateando precio:', error);
    return `$${price}`;
  }
};

// Componente de estrellas interactivas
const StarRating = ({ 
  rating, 
  onRatingChange,
  readonly = false 
}: { 
  rating: number; 
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (star: number) => {
    if (!readonly && onRatingChange) {
      if (rating === 5 && star === 5) {
        onRatingChange(1);
      } else {
        onRatingChange(star);
      }
    }
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`transition-transform hover:scale-110 ${
            !readonly ? 'cursor-pointer' : 'cursor-default'
          }`}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
        >
          <Star
            className={`w-6 h-6 ${
              star <= (hoverRating || rating) 
                ? "text-yellow-500 fill-current" 
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default function ProductPage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userReview, setUserReview] = useState<{
    calificacion: number;
    comentario: string;
  }>({
    calificacion: 5,
    comentario: ""
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userHasPurchased, setUserHasPurchased] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tiendaLoading, setTiendaLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Error fetching user:", error);
        }
        setUser(user);
        return user;
      } catch (error) {
        console.error("Error in fetchUser:", error);
        return null;
      }
    };

    const fetchTienda = async (vendedorId: string) => {
      try {
        console.log("Buscando tienda para vendedor:", vendedorId);
        
        const { data: tiendaData, error: tiendaError } = await supabase
          .from("tiendas")
          .select("id, nombre_tienda, vendedor_id")
          .eq("vendedor_id", vendedorId)
          .single();

        if (tiendaError) {
          console.log("No se encontró tienda para este vendedor:", tiendaError);
          console.log("Error details:", {
            message: tiendaError.message,
            code: tiendaError.code,
            details: tiendaError.details
          });
          setTienda(null);
        } else {
          console.log("Tienda encontrada:", tiendaData);
          setTienda(tiendaData);
        }
      } catch (error) {
        console.error("Error fetching tienda:", error);
        setTienda(null);
      } finally {
        setTiendaLoading(false);
      }
    };

    const fetchProductAndReviews = async () => {
      try {
        setFetchError(null);
        setTiendaLoading(true);
        const currentUser = await fetchUser();

        // Obtener producto - PRIMERO SIN EL JOIN COMPLEJO
        console.log("Fetching product with ID:", id);
        
        const { data: productData, error: productError } = await supabase
          .from("productos")
          .select("*")
          .eq("id", id)
          .single();

        if (productError) {
          console.error("Error fetching product:", productError);
          setFetchError("Error al cargar el producto");
          setLoading(false);
          return;
        }

        console.log("Producto encontrado:", productData);

        // Ahora obtener información del vendedor por separado
        let vendedorInfo = null;
        if (productData.vendedor_id) {
          const { data: vendedorData, error: vendedorError } = await supabase
            .from("usuarios")
            .select("id, nombre")
            .eq("id", productData.vendedor_id)
            .single();

          if (!vendedorError) {
            vendedorInfo = vendedorData;
          }
          console.log("Información del vendedor:", vendedorData);

          // Buscar la tienda del vendedor
          await fetchTienda(productData.vendedor_id);
        }

        // Obtener reviews del producto
        let reviewsList: Review[] = [];
        try {
          const { data: reviewsData, error: reviewsError } = await supabase
            .from("reviews")
            .select(`
              *,
              usuarios (
                email
              )
            `)
            .eq("producto_id", id)
            .order("creado_en", { ascending: false });

          if (reviewsError) {
            console.error("Error fetching reviews:", reviewsError);
            
            // Intentar sin el join con usuarios
            const { data: simpleReviewsData, error: simpleError } = await supabase
              .from("reviews")
              .select("*")
              .eq("producto_id", id)
              .order("creado_en", { ascending: false });

            if (!simpleError) {
              reviewsList = simpleReviewsData || [];
            }
          } else {
            reviewsList = reviewsData || [];
          }
        } catch (reviewsFetchError) {
          console.error("Exception fetching reviews:", reviewsFetchError);
        }
        
        // Verificar si el usuario actual ya hizo una reseña
        if (currentUser) {
          const userReview = reviewsList.find(review => 
            review.usuario_id === currentUser.id
          );
          setUserHasReviewed(!!userReview);

          // Verificar si el usuario ha comprado el producto
          try {
            const { data: orderData, error: orderError } = await supabase
              .from("ordenes")
              .select("id, estado")
              .eq("usuario_id", currentUser.id)
              .eq("estado", "pagado")
              .single();

            if (orderError) {
              console.log("No se encontró orden pagada:", orderError);
              setUserHasPurchased(false);
            } else {
              setUserHasPurchased(!!orderData);
            }
          } catch (orderFetchError) {
            console.error("Error checking purchase:", orderFetchError);
            setUserHasPurchased(false);
          }
        }

        const rating = reviewsList.length > 0
          ? reviewsList.reduce((sum, r) => sum + r.calificacion, 0) / reviewsList.length
          : 0;

        // Combinar toda la información del producto
        const productWithDetails: Product = {
          ...productData,
          vendedor: vendedorInfo,
          rating,
          total_reviews: reviewsList.length,
        };

        setProduct(productWithDetails);
        setReviews(reviewsList);

      } catch (error) {
        console.error("Error in fetch:", error);
        setFetchError("Error al cargar los datos del producto");
      } finally {
        setLoading(false);
        setCheckingPurchase(false);
      }
    };

    if (id) {
      fetchProductAndReviews();
    } else {
      setLoading(false);
      setFetchError("ID de producto no válido");
    }
  }, [id]);

  const addToCart = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    setAdding(true);

    const { error } = await supabase.from("carrito").upsert([
      {
        usuario_id: user.id,
        producto_id: id,
        cantidad: quantity,
      },
    ]);

    if (error) {
      alert("Error al agregar al carrito");
    } else {
      alert("Producto agregado al carrito");
      setQuantity(1);
    }

    setAdding(false);
  };

  const submitReview = async () => {
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    if (!userHasPurchased) {
      alert("Debes haber comprado y pagado este producto para poder dejar una reseña.");
      return;
    }

    if (userHasReviewed) {
      alert("Ya has dejado una reseña para este producto.");
      return;
    }

    if (!userReview.comentario.trim()) {
      alert("Por favor escribe un comentario para tu reseña.");
      return;
    }

    setSubmittingReview(true);

    try {
      const { data, error } = await supabase
        .from("reviews")
        .insert([
          {
            producto_id: id,
            usuario_id: user.id,
            calificacion: userReview.calificacion,
            comentario: userReview.comentario,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      const newReview: Review = {
        id: data.id,
        calificacion: data.calificacion,
        comentario: data.comentario,
        creado_en: data.creado_en,
        usuario_id: data.usuario_id
      };

      const updatedReviews = [newReview, ...reviews];
      setReviews(updatedReviews);
      
      const newRating = updatedReviews.reduce((sum, r) => sum + r.calificacion, 0) / updatedReviews.length;
      setProduct(prev => prev ? {
        ...prev,
        rating: newRating,
        total_reviews: updatedReviews.length,
      } : null);

      setUserReview({
        calificacion: 5,
        comentario: ""
      });
      
      setUserHasReviewed(true);

      alert("¡Reseña enviada exitosamente!");

    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Error al enviar la reseña. Por favor intenta nuevamente.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Función para mostrar estrellas de rating (solo lectura)
  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? "text-yellow-500 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  // Función para generar nombre de usuario
  const getUsername = (review: Review) => {
    if (review.usuarios?.email) {
      return review.usuarios.email.split('@')[0];
    }
    const prefixes = ["Comprador", "Usuario", "Cliente"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const shortId = review.usuario_id.slice(0, 6);
    return `${randomPrefix}_${shortId}`;
  };

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

  if (fetchError || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24 flex-col gap-4">
          <p className="text-red-600 text-lg">{fetchError || "Producto no encontrado"}</p>
          <Button onClick={() => window.location.href = "/"}>
            Volver a la tienda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Imagen */}
            <div className="flex items-center justify-center bg-gray-100 rounded-lg h-96">
              <Image
                src={product.imagen_url || "/placeholder.svg"}
                alt={product.titulo}
                width={400}
                height={400}
                className="object-cover"
              />
            </div>

            {/* Información del producto */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.titulo}
              </h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  {renderStars(product.rating)}
                  <span className="font-semibold ml-2">
                    {product.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-600">
                    ({product.total_reviews} {product.total_reviews === 1 ? 'reseña' : 'reseñas'})
                  </span>
                </div>
              </div>

              <span className="text-4xl font-bold text-gray-900">
                {formatPrice(product.precio)}
              </span>

              <p className="text-gray-600 mb-8 leading-relaxed mt-4">
                {product.descripcion}
              </p>

              {/* SECCIÓN DEL VENDEDOR MEJORADA */}
              <div className="mb-8 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Vendido por {product.vendedor?.nombre || "Desconocido"}
                    </h3>
                    
                    {tiendaLoading ? (
                      <p className="text-blue-600 text-sm">Buscando información de la tienda...</p>
                    ) : tienda ? (
                      <p className="text-blue-700 text-sm">
                        Tienda: {tienda.nombre_tienda}
                      </p>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        Este vendedor no tiene tienda registrada
                      </p>
                    )}
                  </div>
                  
                  {/* BOTÓN PARA IR A LA TIENDA - SOLO SI EXISTE */}
                  {tienda && !tiendaLoading && (
                    <Link href={`/tienda/${tienda.id}`}>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Store className="w-4 h-4 mr-2" />
                        Ver Tienda
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad
                </label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  disabled={product.stock === 0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {Array.from({ length: Math.min(product.stock, 10) }).map(
                    (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    )
                  )}
                </select>
              </div>

              <Button
                onClick={addToCart}
                disabled={product.stock === 0 || adding}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                {product.stock === 0
                  ? "Agotado"
                  : adding
                  ? "Agregando..."
                  : "Agregar al carrito"}
              </Button>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  {product.stock > 0
                    ? `${product.stock} unidades disponibles`
                    : "Sin stock"}
                </p>
              </div>
            </div>
          </div>

          {/* Sección de Reviews (sin cambios) */}
          <div className="border-t border-gray-200">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Reseñas de Compradores
              </h2>

              {/* Formulario para escribir reseña */}
              {user && userHasPurchased && !userHasReviewed && (
                <div className="mb-8 p-6 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      ¡Escribe tu reseña!
                    </h3>
                  </div>
                  <p className="text-green-700 mb-4">
                    Has comprado este producto y puedes compartir tu experiencia.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Calificación
                      </label>
                      <StarRating
                        rating={userReview.calificacion}
                        onRatingChange={(rating) => setUserReview(prev => ({
                          ...prev,
                          calificacion: rating
                        }))}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {userReview.calificacion} estrellas seleccionadas. 
                        {userReview.calificacion === 5 && " Haz clic en 5 estrellas nuevamente para cambiar a 1."}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tu reseña
                      </label>
                      <textarea
                        value={userReview.comentario}
                        onChange={(e) => setUserReview(prev => ({
                          ...prev,
                          comentario: e.target.value
                        }))}
                        placeholder="Comparte tu experiencia con este producto..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        rows={4}
                      />
                    </div>

                    <Button
                      onClick={submitReview}
                      disabled={submittingReview || !userReview.comentario.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {submittingReview ? "Enviando..." : "Enviar Reseña"}
                    </Button>
                  </div>
                </div>
              )}

              {!user && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800">
                    <button 
                      onClick={() => window.location.href = "/auth/login"}
                      className="underline font-semibold hover:text-yellow-900"
                    >
                      Inicia sesión
                    </button>{" "}
                    para dejar una reseña.
                  </p>
                </div>
              )}

              {user && checkingPurchase && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800">
                    Verificando si puedes dejar una reseña...
                  </p>
                </div>
              )}

              {user && !userHasPurchased && !checkingPurchase && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                    <p className="text-blue-800 font-medium">
                      Compra y paga este producto para dejar una reseña
                    </p>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">
                    Solo los clientes que han completado su compra pueden compartir su experiencia.
                  </p>
                </div>
              )}

              {userHasReviewed && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-green-800 font-medium">
                      ¡Ya has dejado una reseña para este producto!
                    </p>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Aún no hay reseñas para este producto</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Sé el primero en compartir tu experiencia
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {getUsername(review)}
                            </p>
                            <div className="flex items-center gap-1">
                              <StarRating 
                                rating={review.calificacion} 
                                readonly 
                              />
                              <span className="text-sm text-gray-500 ml-2">
                                ({review.calificacion}/5)
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.creado_en).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {review.comentario}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}