const stripe = require("../config/stripe");
const axios = require("axios");
require("dotenv").config();

module.exports = async (req, res) => {
  let event;

  try {
    event = JSON.parse(req.body); // ⚠️ En local, signature non vérifiée
  } catch (err) {
    console.error("❌ Webhook parsing error:", err);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // 🎯 Quand le paiement est complété
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata.userId;

    console.log(` Paiement réussi pour user ${userId}`);

    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours

    try {
      await axios.patch(`${process.env.DB_SERVICE_URL}/api/users/subscription/${userId}`, {
        type: 'premium',
        status: 'active',
        date_start: now,
        date_end: endDate
      });

      console.log("📦 Abonnement mis à jour dans la base de données via DB service");
    } catch (err) {
      console.error("❌ Échec de mise à jour de l'abonnement:", err.message);
    }
  }

  res.status(200).json({ received: true });
};
