const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (userId, plan) => {
  console.log("Stripe Key:", process.env.STRIPE_SECRET_KEY ? "✅ OK" : "❌ MISSING");
console.log("Price ID:", process.env.PRICE_ID);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [
      {
        price: plan, // ex: price_123abc
        quantity: 1,
      },
    ],
    success_url: `http://localhost:3000/success`,
    cancel_url: `http://localhost:3000/cancel`,
    metadata: { userId }
  });

  return session.url;
};
