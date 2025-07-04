const stripe = require("../config/stripe");

exports.createCheckoutSession = async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ error: "Email et userId requis" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: process.env.PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
      },
      success_url: `${process.env.FRONTEND_URL}/paiement/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/paiement/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Erreur création session Stripe:", err);
    res.status(500).json({ error: "Échec de création de session Stripe" });
  }
};
