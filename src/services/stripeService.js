// const Stripe = require("stripe");
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// exports.createCheckoutSession = async (userId, plan) => {
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     mode: "subscription",
//     line_items: [
//       {
//         price: plan, 
//         quantity: 1,
//       },
//     ],
//     success_url: "http://localhost:3000/success",
//     cancel_url: "http://localhost:3000/cancel",
//     metadata: { userId }
//   });

//   return session.url;
// };


// src/services/stripeService.js
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// FRONT URL fiable (https en prod, localhost en dev)
const isProd = process.env.NODE_ENV === "production";
const FRONT_BASE_URL = (() => {
  const v = (process.env.FRONTEND_URL || "").trim().replace(/\/+$/, "");
  if (isProd && !v) {
    // on évite d'envoyer une URL vide à Stripe en prod
    throw new Error("FRONTEND_URL manquante en production (payment service)");
  }
  return v || "http://localhost:3000";
})();

/**
 * Crée une session Stripe Checkout de type abonnement
 * @param {string} userId - l'ID utilisateur (servira au webhook)
 * @param {string} plan   - l'ID de prix Stripe (price_xxx)
 * @returns {Promise<string>} URL de redirection Stripe Checkout
 */
exports.createCheckoutSession = async (userId, plan) => {
  if (!userId) {
    throw new Error("userId manquant");
  }
  if (!plan) {
    throw new Error("plan (priceId) manquant");
  }

  const successUrl = `${FRONT_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = `${FRONT_BASE_URL}/cancel`;

  // logs utiles (s’affichent dans Render)
  console.log("[STRIPE] FRONT_BASE_URL =", FRONT_BASE_URL);
  console.log("[STRIPE] success_url   =", successUrl);
  console.log("[STRIPE] cancel_url    =", cancelUrl);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [
      {
        price: plan, // ton ID de price (ex: price_123)
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId }, // ✅ indispensable pour le webhook
    // allow_promotion_codes: true, // optionnel
  });

  return session.url; // tu utilisais déjà l'URL côté route
};
