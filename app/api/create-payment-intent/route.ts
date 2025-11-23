// import { NextRequest, NextResponse } from "next/server";
// import stripe from "@/lib/stripe";

// export async function POST(request: NextRequest) {
//   try {
//     const { amount, orderId } = await request.json();

//     if (!amount || !orderId) {
//       return NextResponse.json(
//         { error: "Missing amount or orderId" },
//         { status: 400 }
//       );
//     }

//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(amount * 100),
//       currency: "usd",
//       metadata: {
//         orderId: orderId,
//       },
//     });

//     return NextResponse.json({
//       clientSecret: paymentIntent.client_secret,
//     });
//   } catch (error) {
//     console.error("Error creating payment intent:", error);
//     return NextResponse.json(
//       { error: "Error creating payment intent" },
//       { status: 500 }
//     );
//   }
// }
