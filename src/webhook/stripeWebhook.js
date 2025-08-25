const stripe = require("../config/stripe");
const axios = require("axios");
require("dotenv").config();

module.exports = (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("⚠️ Webhook signature vérification échouée.", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata.userId;

    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    axios.patch(`${process.env.DB_SERVICE_URL}/api/users/subscription/${userId}`, {
      type: "premium",
      status: "active",
      date_start: now,
      date_end: endDate
    }).then(() => {
      console.log("Abonnement mis à jour");
    }).catch(err => {
      console.error("Erreur mise à jour abonnement :", err.message);
    });
  }

  res.status(200).json({ received: true });
};
