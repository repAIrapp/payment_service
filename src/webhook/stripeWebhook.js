// const stripe = require("../config/stripe");
// const axios = require("axios");
// require("dotenv").config();

// module.exports = (req, res) => {
//   const sig = req.headers["stripe-signature"];
//   const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//   } catch (err) {
//     console.error("⚠️ Webhook signature vérification échouée.", err.message);
//     return res.status(400).send(`Webhook error: ${err.message}`);
//   }

//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object;
//     const userId = session.metadata.userId;

//     const now = new Date();
//     const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

//     // axios.patch(`${process.env.DB_SERVICE_URL}/api/users/subscription/${userId}`, {
//     //   type: "premium",
//     //   status: "active",
//     //   date_start: now,
//     //   date_end: endDate
//     // })
//     axios.patch(`${process.env.DB_SERVICE_URL}/api/users/subscription/${userId}`, {
//   subscription: {
//     type: "premium",
//     status: "active",
//     date_start: now.toISOString(),
//     date_end: endDate.toISOString()
//   }
// })
// .then(() => {
//       console.log("Abonnement mis à jour");
//     }).catch(err => {
//       console.error("Erreur mise à jour abonnement :", err.message);
//     });
//   }

//   res.status(200).json({ received: true });
// };








const stripe = require("../config/stripe");
const axios = require("axios");
require("dotenv").config();

module.exports = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("⚠️ Signature webhook invalide :", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  console.log("➡️  Event reçu :", event.type);

  // Utilitaires communs
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const isoStart = now.toISOString();
  const isoEnd = endDate.toISOString();

  async function updateSubscription(userId) {
    const url = `${process.env.DB_SERVICE_URL}/api/users/subscription/${userId}`;

    // 1) format imbriqué (souvent correct vu ton schéma en BDD)
    const nestedPayload = {
      subscription: {
        type: "premium",
        status: "active",
        date_start: isoStart,
        date_end: isoEnd,
      },
    };

    // 2) format plat (fallback si la route DB attend les champs à la racine)
    const flatPayload = {
      type: "premium",
      status: "active",
      date_start: isoStart,
      date_end: isoEnd,
    };

    const headers = {};
    if (process.env.DB_SERVICE_TOKEN) {
      headers.Authorization = `Bearer ${process.env.DB_SERVICE_TOKEN}`;
    }

    try {
      console.log("🟦 PATCH DB (nested) ->", url, JSON.stringify(nestedPayload));
      const r1 = await axios.patch(url, nestedPayload, { headers });
      console.log("✅ DB OK (nested) status:", r1.status, "data:", r1.data);
      return true;
    } catch (e1) {
      console.error("🟥 DB échec (nested):", e1.message);
      if (e1.response) {
        console.error("   ↳ status:", e1.response.status);
        console.error("   ↳ data:", e1.response.data);
      }
      // tente format plat
      try {
        console.log("🟦 PATCH DB (flat) ->", url, JSON.stringify(flatPayload));
        const r2 = await axios.patch(url, flatPayload, { headers });
        console.log("✅ DB OK (flat) status:", r2.status, "data:", r2.data);
        return true;
      } catch (e2) {
        console.error("🟥 DB échec (flat):", e2.message);
        if (e2.response) {
          console.error("   ↳ status:", e2.response.status);
          console.error("   ↳ data:", e2.response.data);
        }
        return false;
      }
    }
  }

  // 1) Activation dès la fin du checkout (si tu t’appuies sur metadata.userId)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session?.metadata?.userId;
    console.log("checkout.session.completed -> userId:", userId);
    if (userId) {
      await updateSubscription(userId);
    } else {
      console.warn("⚠️ Pas de metadata.userId dans la session.");
    }
  }

  // 2) Activation sûre quand le paiement d’abonnement est confirmé
  if (event.type === "invoice.payment_succeeded") {
    // Si tu as mis client_reference_id dans la session de checkout, tu peux le retrouver via l’API.
    // Ici, on tente d’abord via metadata au cas où tu la propages côté checkout.
    const invoice = event.data.object;

    // Si tu veux être 100% fiable : sauvegarde `client_reference_id` lors de la création de session
    // et récupère-­le ensuite. En attendant, on tente via metadata (si présente).
    const userId = invoice?.metadata?.userId;
    console.log("invoice.payment_succeeded -> userId:", userId);
    if (userId) {
      await updateSubscription(userId);
    } else {
      console.warn("⚠️ Pas de userId sur l’invoice (metadata). Pense à propager client_reference_id.");
    }
  }

  return res.status(200).json({ received: true });
};
