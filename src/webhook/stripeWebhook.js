// const stripe = require("../config/stripe");
// const axios = require("axios");
// require("dotenv").config();

// module.exports = async (req, res) => {
//   const sig = req.headers["stripe-signature"];
//   const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

//   let event;
//   try {
//     event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//   } catch (err) {
//     console.error("Signature webhook invalide :", err.message);
//     return res.status(400).send(`Webhook error: ${err.message}`);
//   }

//   console.log("Event reçu :", event.type);

//   // Utilitaires communs
//   const now = new Date();
//   const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
//   const isoStart = now.toISOString();
//   const isoEnd = endDate.toISOString();

//   async function updateSubscription(userId) {
//     const url = `${process.env.DB_SERVICE_URL}/api/users/subscription/${userId}`;

//     // 1) format imbriqué (souvent correct vu ton schéma en BDD)
//     const nestedPayload = {
//       subscription: {
//         type: "premium",
//         status: "active",
//         date_start: isoStart,
//         date_end: isoEnd,
//       },
//     };

//     // 2) format plat (fallback si la route DB attend les champs à la racine)
//     const flatPayload = {
//       type: "premium",
//       status: "active",
//       date_start: isoStart,
//       date_end: isoEnd,
//     };

//     const headers = {};
//     if (process.env.DB_SERVICE_TOKEN) {
//       headers.Authorization = `Bearer ${process.env.DB_SERVICE_TOKEN}`;
//     }

//     try {
//       console.log("PATCH DB (nested) ->", url, JSON.stringify(nestedPayload));
//       const r1 = await axios.patch(url, nestedPayload, { headers });
//       console.log(" DB OK (nested) status:", r1.status, "data:", r1.data);
//       return true;
//     } catch (e1) {
//       console.error(" DB échec (nested):", e1.message);
//       if (e1.response) {
//         console.error("   ↳ status:", e1.response.status);
//         console.error("   ↳ data:", e1.response.data);
//       }
//       // tente format plat
//       try {
//         console.log(" PATCH DB (flat) ->", url, JSON.stringify(flatPayload));
//         const r2 = await axios.patch(url, flatPayload, { headers });
//         console.log(" DB OK (flat) status:", r2.status, "data:", r2.data);
//         return true;
//       } catch (e2) {
//         console.error(" DB échec (flat):", e2.message);
//         if (e2.response) {
//           console.error("   ↳ status:", e2.response.status);
//           console.error("   ↳ data:", e2.response.data);
//         }
//         return false;
//       }
//     }
//   }

//   // 1) Activation dès la fin du checkout (si tu t’appuies sur metadata.userId)
//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object;
//     const userId = session?.metadata?.userId;
//     console.log("checkout.session.completed -> userId:", userId);
//     if (userId) {
//       await updateSubscription(userId);
//     } else {
//       console.warn("Pas de metadata.userId dans la session.");
//     }
//   }

//   // 2) Activation sûre quand le paiement d’abonnement est confirmé
//   if (event.type === "invoice.payment_succeeded") {
//     const invoice = event.data.object;
//     const userId = invoice?.metadata?.userId;
//     console.log("invoice.payment_succeeded -> userId:", userId);
//     if (userId) {
//       await updateSubscription(userId);
//     } else {
//       console.warn("Pas de userId sur l’invoice (metadata). Pense à propager client_reference_id.");
//     }
//   }

//   return res.status(200).json({ received: true });
// };



// src/webhook/stripeWebhook.js
const stripe = require("../config/stripe");
const axios = require("axios");

// ⚠️ important: en prod (Render), NE PAS recharger .env
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

module.exports = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error("[WEBHOOK] STRIPE_WEBHOOK_SECRET manquant");
    // 400 côté Stripe => il retentera, utile si tu viens d’oublier la var
    return res.status(400).send("Missing STRIPE_WEBHOOK_SECRET");
  }

  // --- DB URL sûre (complète, avec https) ---
  const rawDbUrl = (process.env.DB_SERVICE_URL || "").trim();
  const DB_SERVICE_URL = rawDbUrl.replace(/\/+$/, ""); // enlève le trailing /
  if (!DB_SERVICE_URL) {
    console.error("[WEBHOOK] DB_SERVICE_URL manquant (ex: https://db-service-xxx.onrender.com/api)");
    // on répond 200 pour ne pas boucler, mais il faut corriger la conf
    return res.status(200).send("ok");
  }
  if (!/^https?:\/\//i.test(DB_SERVICE_URL)) {
    console.error("[WEBHOOK] DB_SERVICE_URL invalide (pas de http/https):", DB_SERVICE_URL);
    return res.status(200).send("ok");
  }
  // -------------------------------------------

  let event;
  try {
    // ⚠️ req.body doit être RAW Buffer (express.raw dans la route)
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Signature webhook invalide :", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  console.log("[WEBHOOK] Event reçu :", event.type);

  // Utilitaires communs
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const isoStart = now.toISOString();
  const isoEnd = endDate.toISOString();

  async function updateSubscription(userId) {
    // ton endpoint actuel: /api/users/subscription/:userId
    const url = `${DB_SERVICE_URL}/users/subscription/${userId}`;

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
      console.log("[WEBHOOK] PATCH DB (nested) ->", url, JSON.stringify(nestedPayload));
      const r1 = await axios.patch(url, nestedPayload, { headers, timeout: 10000 });
      console.log("[WEBHOOK] DB OK (nested) status:", r1.status);
      return true;
    } catch (e1) {
      console.error("[WEBHOOK] DB échec (nested):", e1.message);
      if (e1.response) {
        console.error("   ↳ status:", e1.response.status);
        console.error("   ↳ data:", e1.response.data);
      }
      // tente format plat
      try {
        console.log("[WEBHOOK] PATCH DB (flat) ->", url, JSON.stringify(flatPayload));
        const r2 = await axios.patch(url, flatPayload, { headers, timeout: 10000 });
        console.log("[WEBHOOK] DB OK (flat) status:", r2.status);
        return true;
      } catch (e2) {
        console.error("[WEBHOOK] DB échec (flat):", e2.message);
        if (e2.response) {
          console.error("   ↳ status:", e2.response.status);
          console.error("   ↳ data:", e2.response.data);
        }
        return false;
      }
    }
  }

  try {
    // 1) Activation dès la fin du checkout (si metadata.userId présent)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session?.metadata?.userId;
      console.log("[WEBHOOK] checkout.session.completed -> userId:", userId);
      if (userId) {
        await updateSubscription(userId);
      } else {
        console.warn("[WEBHOOK] Pas de metadata.userId dans la session.");
      }
    }

    // 2) Confirmation de paiement d’abonnement (renouvellement, etc.)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const userId = invoice?.metadata?.userId;
      console.log("[WEBHOOK] invoice.payment_succeeded -> userId:", userId);
      if (userId) {
        await updateSubscription(userId);
      } else {
        console.warn("[WEBHOOK] Pas de userId sur l’invoice (metadata). Pense à propager metadata lors de la création.");
      }
    }

    // Toujours 200 pour Stripe (il retentera sinon)
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[WEBHOOK] handler error:", err.message);
    // 200 pour éviter les boucles si la BDD est momentanément indispo
    return res.status(200).json({ received: true });
  }
};
